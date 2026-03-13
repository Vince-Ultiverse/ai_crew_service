import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Agent } from '../agents/entities/agent.entity';
import { buildSlackManifest } from './slack-manifest';

interface SlackTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix timestamp in ms
}

const TOKEN_FILE = join(process.cwd(), 'data', 'slack-config-tokens.json');

@Injectable()
export class SlackOAuthService {
  private readonly logger = new Logger(SlackOAuthService.name);
  private cachedTokens: SlackTokens | null = null;

  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
  ) {
    this.loadTokensFromDisk();
  }

  /**
   * Get a valid Slack Configuration Token, refreshing if expired.
   */
  private async getConfigToken(): Promise<string> {
    // If we have cached tokens and they're still valid (with 5min buffer), use them
    if (this.cachedTokens && Date.now() < this.cachedTokens.expires_at - 5 * 60 * 1000) {
      return this.cachedTokens.access_token;
    }

    // Try to refresh if we have a refresh token
    const refreshToken =
      this.cachedTokens?.refresh_token || process.env.SLACK_CONFIG_REFRESH_TOKEN;

    if (refreshToken) {
      this.logger.log('Config token expired or missing, attempting refresh...');
      const refreshed = await this.refreshConfigToken(refreshToken);
      if (refreshed) {
        return refreshed.access_token;
      }
    }

    // Fall back to env var (may be expired)
    const envToken = process.env.SLACK_CONFIG_TOKEN;
    if (!envToken) {
      throw new BadRequestException(
        'SLACK_CONFIG_TOKEN is not configured and no refresh token available. ' +
          'Please set SLACK_CONFIG_TOKEN and SLACK_CONFIG_REFRESH_TOKEN in environment variables.',
      );
    }

    return envToken;
  }

  /**
   * Refresh the config token using Slack's tooling.tokens.rotate API.
   */
  private async refreshConfigToken(refreshToken: string): Promise<SlackTokens | null> {
    try {
      const res = await fetch('https://slack.com/api/tooling.tokens.rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ refresh_token: refreshToken }),
      });
      const data = await res.json();

      if (!data.ok) {
        this.logger.error(`Token refresh failed: ${data.error}`);
        return null;
      }

      const tokens: SlackTokens = {
        access_token: data.token,
        refresh_token: data.refresh_token,
        expires_at: data.exp * 1000, // Slack returns seconds, convert to ms
      };

      this.cachedTokens = tokens;
      this.saveTokensToDisk(tokens);
      this.logger.log('Slack config token refreshed successfully');
      return tokens;
    } catch (err) {
      this.logger.error(`Token refresh request failed: ${err}`);
      return null;
    }
  }

  private loadTokensFromDisk(): void {
    try {
      if (existsSync(TOKEN_FILE)) {
        const raw = readFileSync(TOKEN_FILE, 'utf-8');
        this.cachedTokens = JSON.parse(raw);
        this.logger.log('Loaded cached Slack config tokens from disk');
      }
    } catch {
      this.logger.warn('Failed to load cached Slack tokens from disk');
    }
  }

  private saveTokensToDisk(tokens: SlackTokens): void {
    try {
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    } catch (err) {
      this.logger.warn(`Failed to persist Slack tokens to disk: ${err}`);
    }
  }

  async initiateOAuth(agentId: string): Promise<{ installUrl: string }> {
    const configToken = await this.getConfigToken();

    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI;
    if (!redirectUri) {
      throw new BadRequestException('SLACK_OAUTH_REDIRECT_URI is not configured.');
    }

    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);

    // Create Slack app via manifest API
    const manifest = buildSlackManifest(agent.name, redirectUri);
    const createRes = await fetch('https://slack.com/api/apps.manifest.create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ manifest }),
    });
    const createData = await createRes.json();

    if (!createData.ok) {
      this.logger.error(`apps.manifest.create failed: ${JSON.stringify(createData)}`);

      // If token expired during request, try one more time with a fresh token
      if (createData.error === 'token_expired' || createData.error === 'invalid_auth') {
        const refreshToken =
          this.cachedTokens?.refresh_token || process.env.SLACK_CONFIG_REFRESH_TOKEN;
        if (refreshToken) {
          this.logger.log('Token expired during API call, forcing refresh...');
          const refreshed = await this.refreshConfigToken(refreshToken);
          if (refreshed) {
            return this.initiateOAuthWithToken(agentId, refreshed.access_token, redirectUri, manifest);
          }
        }
        throw new BadRequestException(
          'Slack Configuration Token has expired and could not be refreshed. ' +
            'Please provide a valid SLACK_CONFIG_REFRESH_TOKEN or generate a new config token at api.slack.com/apps.',
        );
      }

      throw new BadRequestException(
        `Failed to create Slack app: ${createData.error || 'unknown error'}`,
      );
    }

    return this.buildInstallUrl(agentId, createData, redirectUri, manifest);
  }

  private async initiateOAuthWithToken(
    agentId: string,
    configToken: string,
    redirectUri: string,
    manifest: Record<string, any>,
  ): Promise<{ installUrl: string }> {
    const createRes = await fetch('https://slack.com/api/apps.manifest.create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ manifest }),
    });
    const createData = await createRes.json();

    if (!createData.ok) {
      this.logger.error(`apps.manifest.create retry failed: ${JSON.stringify(createData)}`);
      throw new BadRequestException(
        `Failed to create Slack app after token refresh: ${createData.error || 'unknown error'}`,
      );
    }

    return this.buildInstallUrl(agentId, createData, redirectUri, manifest);
  }

  private async buildInstallUrl(
    agentId: string,
    createData: any,
    redirectUri: string,
    manifest: Record<string, any>,
  ): Promise<{ installUrl: string }> {
    const { app_id, credentials } = createData;
    const { client_id, client_secret } = credentials;

    // Generate state with timestamp for expiration check
    const stateNonce = randomBytes(16).toString('hex');
    const state = `${Date.now()}:${agentId}:${stateNonce}`;

    // Store OAuth state and credentials on the agent
    await this.agentRepo
      .createQueryBuilder()
      .update(Agent)
      .set({
        slack_app_id: app_id,
        slack_oauth_state: state,
        slack_oauth_credentials: { client_id, client_secret },
      })
      .where('id = :id', { id: agentId })
      .execute();

    // Build OAuth install URL
    const scopes = manifest.oauth_config.scopes.bot.join(',');
    const installUrl =
      `https://slack.com/oauth/v2/authorize` +
      `?client_id=${encodeURIComponent(client_id)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;

    return { installUrl };
  }

  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ agentId: string; teamName: string }> {
    // Parse state: "timestamp:agentId:nonce"
    const parts = state.split(':');
    if (parts.length < 3) {
      throw new UnauthorizedException('Invalid OAuth state format');
    }

    const timestamp = parseInt(parts[0], 10);
    const agentId = parts[1];
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - timestamp > tenMinutes) {
      throw new UnauthorizedException('OAuth state has expired. Please try again.');
    }

    // Verify state matches the stored value
    const agent = await this.agentRepo
      .createQueryBuilder('agent')
      .addSelect('agent.slack_oauth_state')
      .addSelect('agent.slack_oauth_credentials')
      .where('agent.id = :id', { id: agentId })
      .getOne();

    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    if (agent.slack_oauth_state !== state) {
      throw new UnauthorizedException('OAuth state mismatch');
    }

    const credentials = agent.slack_oauth_credentials;
    if (!credentials?.client_id || !credentials?.client_secret) {
      throw new BadRequestException('Missing OAuth credentials. Please restart the flow.');
    }

    // Exchange code for bot token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        code,
        redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI || '',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      this.logger.error(`oauth.v2.access failed: ${JSON.stringify(tokenData)}`);
      throw new BadRequestException(`OAuth token exchange failed: ${tokenData.error}`);
    }

    const botToken = tokenData.access_token;
    const teamId = tokenData.team?.id;
    const teamName = tokenData.team?.name || 'Unknown Workspace';
    const appId = agent.slack_app_id;

    // Try to generate App-Level Token for Socket Mode
    let appToken: string | null = null;
    if (appId) {
      try {
        const configToken = await this.getConfigToken();
        appToken = await this.generateAppLevelToken(configToken, appId);
      } catch (err) {
        this.logger.warn(`Could not get config token for app-level token generation: ${err}`);
      }
    }

    // Update agent with tokens
    const updateData: Partial<Agent> = {
      slack_bot_token: botToken,
      slack_team_id: teamId,
      slack_team_name: teamName,
      slack_enabled: true,
      slack_oauth_state: null as any,
      slack_oauth_credentials: null as any,
    };
    if (appToken) {
      updateData.slack_app_token = appToken;
    }

    await this.agentRepo.update(agentId, updateData);

    this.logger.log(`Slack OAuth completed for agent ${agentId} in workspace ${teamName}`);
    return { agentId, teamName };
  }

  async disconnectSlack(agentId: string): Promise<void> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);

    // Optionally revoke token on Slack side
    if (agent.slack_bot_token) {
      try {
        await fetch('https://slack.com/api/auth.revoke', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${agent.slack_bot_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to revoke Slack token: ${err}`);
      }
    }

    await this.agentRepo.update(agentId, {
      slack_bot_token: null as any,
      slack_app_token: null as any,
      slack_team_id: null as any,
      slack_team_name: null as any,
      slack_app_id: null as any,
      slack_enabled: false,
      slack_oauth_state: null as any,
      slack_oauth_credentials: null as any,
    });

    this.logger.log(`Slack disconnected for agent ${agentId}`);
  }

  async getSlackStatus(
    agentId: string,
  ): Promise<{ connected: boolean; teamName?: string; teamId?: string; hasAppToken?: boolean; appId?: string }> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);

    const connected = !!agent.slack_bot_token;
    return {
      connected,
      ...(connected
        ? {
            teamName: agent.slack_team_name,
            teamId: agent.slack_team_id,
            hasAppToken: !!agent.slack_app_token,
            appId: agent.slack_app_id,
          }
        : {}),
    };
  }

  async getBotProfile(agentId: string): Promise<{
    name?: string;
    icons?: { image_48?: string; image_72?: string };
    botId?: string;
  }> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    if (!agent.slack_bot_token) throw new BadRequestException('Agent is not connected to Slack');

    // Get bot user info via auth.test to find the bot_user_id
    const authRes = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${agent.slack_bot_token}` },
    });
    const authData = await authRes.json();
    if (!authData.ok) throw new BadRequestException(`Slack auth.test failed: ${authData.error}`);

    const botUserId = authData.user_id;

    // Get user profile to retrieve display name and avatar
    const profileRes = await fetch(`https://slack.com/api/users.info?user=${botUserId}`, {
      headers: { Authorization: `Bearer ${agent.slack_bot_token}` },
    });
    const profileData = await profileRes.json();

    return {
      name: profileData.user?.profile?.display_name || profileData.user?.real_name || authData.user,
      icons: profileData.user?.profile ? {
        image_48: profileData.user.profile.image_48,
        image_72: profileData.user.profile.image_72,
      } : undefined,
      botId: botUserId,
    };
  }

  async updateBotDisplayName(agentId: string, displayName: string): Promise<{ ok: boolean }> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    if (!agent.slack_bot_token) throw new BadRequestException('Agent is not connected to Slack');
    if (!agent.slack_app_id) throw new BadRequestException('No Slack app ID found');

    // Update the bot display name via manifest update
    const configToken = await this.getConfigToken();
    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI || '';
    const manifest = (await import('./slack-manifest')).buildSlackManifest(displayName, redirectUri);

    const res = await fetch('https://slack.com/api/apps.manifest.update', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: agent.slack_app_id,
        manifest,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      this.logger.error(`apps.manifest.update failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(`Failed to update bot name: ${data.error}`);
    }

    this.logger.log(`Bot display name updated to "${displayName}" for agent ${agentId}`);
    return { ok: true };
  }

  async uploadBotAvatar(agentId: string, imageBuffer: Buffer, filename: string): Promise<{ ok: boolean }> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    if (!agent.slack_bot_token) throw new BadRequestException('Agent is not connected to Slack');

    // Use Node.js native FormData (Node 18+) for Slack API compatibility
    const form = new FormData();
    const blob = new Blob([imageBuffer as unknown as ArrayBuffer], { type: 'image/png' });
    form.append('image', blob, filename);

    const res = await fetch('https://slack.com/api/users.setPhoto', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agent.slack_bot_token}`,
      },
      body: form,
    });
    const data = await res.json();

    if (!data.ok) {
      this.logger.error(`users.setPhoto failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(`Failed to upload avatar: ${data.error}`);
    }

    this.logger.log(`Bot avatar updated for agent ${agentId}`);
    return { ok: true };
  }

  private async generateAppLevelToken(
    configToken: string,
    appId: string,
  ): Promise<string | null> {
    try {
      const res = await fetch('https://slack.com/api/tooling.tokens.rotate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${configToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: appId,
          scopes: ['connections:write', 'app_configurations:write'],
        }),
      });
      const data = await res.json();

      if (data.ok && data.token) {
        this.logger.log(`App-level token generated for app ${appId}`);
        return data.token;
      }

      this.logger.warn(
        `tooling.tokens.rotate did not return token: ${JSON.stringify(data)}. ` +
          'App-level token must be provided manually.',
      );
      return null;
    } catch (err) {
      this.logger.warn(`Failed to generate app-level token: ${err}`);
      return null;
    }
  }
}
