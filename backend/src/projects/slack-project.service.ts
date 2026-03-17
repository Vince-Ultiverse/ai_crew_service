import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import WebSocket from 'ws';
import { Project } from './entities/project.entity';
import { ProjectMessage } from './entities/project-message.entity';
import { Agent } from '../agents/entities/agent.entity';

interface SlackListener {
  ws: WebSocket | null;
  projectId: string;
  appToken: string;
  channelId: string;
  botUserIds: Set<string>;
}

@Injectable()
export class SlackProjectService {
  private readonly logger = new Logger(SlackProjectService.name);

  /** Active Socket Mode listeners keyed by projectId */
  private activeListeners = new Map<string, SlackListener>();

  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(ProjectMessage)
    private messageRepo: Repository<ProjectMessage>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
  ) {}

  /**
   * Set up a Slack channel for a project.
   * If channelId is given, join it; otherwise create a new one.
   * All project member bots join the channel.
   */
  async setupChannel(
    projectId: string,
    channelId?: string,
  ): Promise<{ channelId: string; channelName: string }> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.agent'],
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    const slackAgents = this.getSlackAgents(project);
    if (slackAgents.length === 0) {
      throw new Error('No project members have Slack connected');
    }

    // Verify all bots in same workspace
    const teamIds = new Set(slackAgents.map((a) => a.slack_team_id));
    if (teamIds.size > 1) {
      throw new Error('All Slack agents must be in the same workspace');
    }

    // Use first agent's token for channel operations
    const primaryToken = slackAgents[0].slack_bot_token;

    let resultChannelId: string;
    let resultChannelName: string;

    if (channelId) {
      // Join existing channel
      const info = await this.slackApi(primaryToken, 'conversations.info', { channel: channelId });
      if (!info.ok) throw new Error(`Cannot access channel: ${info.error}`);
      resultChannelId = channelId;
      resultChannelName = info.channel.name;
    } else {
      // Create new channel
      const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
      const rand = Math.random().toString(36).substring(2, 6);
      const name = `ai-crew-${slug}-${rand}`;

      const result = await this.slackApi(primaryToken, 'conversations.create', {
        name,
        is_private: false,
      });
      if (!result.ok) throw new Error(`Failed to create channel: ${result.error}`);
      resultChannelId = result.channel.id;
      resultChannelName = result.channel.name;
    }

    // All bots join the channel
    for (const agent of slackAgents) {
      try {
        await this.slackApi(agent.slack_bot_token, 'conversations.join', {
          channel: resultChannelId,
        });
      } catch (err: any) {
        this.logger.warn(`Bot ${agent.name} failed to join channel: ${err.message}`);
      }
    }

    // Set topic
    try {
      await this.slackApi(primaryToken, 'conversations.setTopic', {
        channel: resultChannelId,
        topic: `AI Crew Project: ${project.name}${project.goal ? ` — ${project.goal.substring(0, 200)}` : ''}`,
      });
    } catch {
      // Non-critical
    }

    // Save to project
    project.slack_channel_id = resultChannelId;
    project.slack_channel_name = resultChannelName;
    await this.projectRepo.save(project);

    return { channelId: resultChannelId, channelName: resultChannelName };
  }

  /**
   * Post a project message to the linked Slack channel.
   * Picks the right bot token based on message role/agent.
   */
  async postToSlackIfLinked(projectId: string, message: ProjectMessage): Promise<void> {
    // Skip messages that came FROM Slack (dedup)
    if (message.slack_ts) return;

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project?.slack_channel_id) return;

    const slackAgents = await this.getSlackAgentsByProject(projectId);
    if (slackAgents.length === 0) return;

    let token: string;
    let text: string;

    if (message.role === 'assistant' && message.agent_id) {
      // Find the matching agent bot
      const agent = slackAgents.find((a) => a.id === message.agent_id);
      if (agent) {
        token = agent.slack_bot_token;
        text = message.content;
      } else {
        // Fallback: use any bot with prefix
        token = slackAgents[0].slack_bot_token;
        text = `*[${message.agent_name || 'Agent'}]* ${message.content}`;
      }
    } else if (message.role === 'user') {
      token = slackAgents[0].slack_bot_token;
      text = `*[User]* ${message.content}`;
    } else if (message.role === 'system') {
      token = slackAgents[0].slack_bot_token;
      text = `_[System]_ ${message.content}`;
    } else {
      return;
    }

    try {
      const result = await this.slackApi(token, 'chat.postMessage', {
        channel: project.slack_channel_id,
        text,
      });
      if (result.ok && result.ts) {
        // Store slack_ts for dedup
        await this.messageRepo.update(message.id, { slack_ts: result.ts });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to post to Slack for project ${projectId}: ${err.message}`);
    }
  }

  /**
   * Start listening for Slack messages on the linked channel via Socket Mode.
   */
  async startSocketListener(
    projectId: string,
    onMessage: (text: string, slackTs: string, userName: string) => void,
  ): Promise<void> {
    if (this.activeListeners.has(projectId)) {
      this.logger.warn(`Socket listener already active for project ${projectId}`);
      return;
    }

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.agent'],
    });
    if (!project?.slack_channel_id) return;

    const slackAgents = this.getSlackAgents(project);
    // Need an agent with app_token for Socket Mode
    const socketAgent = slackAgents.find((a) => a.slack_app_token);
    if (!socketAgent) {
      this.logger.warn(`No agent with app_token for project ${projectId}`);
      return;
    }

    // Collect all bot user IDs to filter our own messages
    const botUserIds = new Set<string>();
    for (const agent of slackAgents) {
      try {
        const authResult = await this.slackApi(agent.slack_bot_token, 'auth.test', {});
        if (authResult.ok && authResult.user_id) {
          botUserIds.add(authResult.user_id);
        }
      } catch {
        // skip
      }
    }

    const listener: SlackListener = {
      ws: null,
      projectId,
      appToken: socketAgent.slack_app_token,
      channelId: project.slack_channel_id,
      botUserIds,
    };
    this.activeListeners.set(projectId, listener);

    this.connectWebSocket(listener, onMessage);
  }

  stopSocketListener(projectId: string): void {
    const listener = this.activeListeners.get(projectId);
    if (listener) {
      this.activeListeners.delete(projectId);
      if (listener.ws) {
        try { listener.ws.close(); } catch {}
        listener.ws = null;
      }
      this.logger.log(`Socket listener stopped for project ${projectId}`);
    }
  }

  async disconnectChannel(projectId: string): Promise<void> {
    this.stopSocketListener(projectId);
    await this.projectRepo.update(projectId, {
      slack_channel_id: null as any,
      slack_channel_name: null as any,
    });
  }

  async getChannelStatus(projectId: string): Promise<{
    connected: boolean;
    channelId: string | null;
    channelName: string | null;
    listening: boolean;
  }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    return {
      connected: !!project?.slack_channel_id,
      channelId: project?.slack_channel_id || null,
      channelName: project?.slack_channel_name || null,
      listening: this.activeListeners.has(projectId),
    };
  }

  // --- Private helpers ---

  private getSlackAgents(project: Project): Agent[] {
    return (project.members || [])
      .map((m) => m.agent)
      .filter((a) => a?.slack_bot_token && a?.slack_team_id);
  }

  private async getSlackAgentsByProject(projectId: string): Promise<Agent[]> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.agent'],
    });
    if (!project) return [];
    return this.getSlackAgents(project);
  }

  private async connectWebSocket(
    listener: SlackListener,
    onMessage: (text: string, slackTs: string, userName: string) => void,
  ): Promise<void> {
    try {
      // Get WebSocket URL via apps.connections.open
      const res = await fetch('https://slack.com/api/apps.connections.open', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${listener.appToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = await res.json();
      if (!data.ok || !data.url) {
        this.logger.error(`Failed to open Socket Mode connection: ${data.error || 'no url'}`);
        this.scheduleReconnect(listener, onMessage);
        return;
      }

      const ws = new WebSocket(data.url);
      listener.ws = ws;

      ws.on('open', () => {
        this.logger.log(`Socket Mode connected for project ${listener.projectId}`);
      });

      ws.on('message', async (raw: Buffer) => {
        try {
          const payload = JSON.parse(raw.toString());

          // ACK envelope
          if (payload.envelope_id) {
            ws.send(JSON.stringify({ envelope_id: payload.envelope_id }));
          }

          // Process events_api type
          if (payload.type === 'events_api' && payload.payload?.event) {
            const event = payload.payload.event;

            // Only handle message events in our channel
            if (
              event.type === 'message' &&
              !event.subtype &&
              event.channel === listener.channelId &&
              event.text &&
              event.ts
            ) {
              // Skip our own bots
              if (listener.botUserIds.has(event.user)) return;

              // Dedup: check if we already have this slack_ts
              const existing = await this.messageRepo.findOne({
                where: { project_id: listener.projectId, slack_ts: event.ts },
              });
              if (existing) return;

              // Resolve user name
              let userName = 'Slack User';
              try {
                const primaryAgent = await this.getSlackAgentsByProject(listener.projectId);
                if (primaryAgent.length > 0) {
                  const userInfo = await this.slackApi(
                    primaryAgent[0].slack_bot_token,
                    'users.info',
                    { user: event.user },
                  );
                  if (userInfo.ok) {
                    userName = userInfo.user.real_name || userInfo.user.name || userName;
                  }
                }
              } catch {
                // non-critical
              }

              onMessage(event.text, event.ts, userName);
            }
          }
        } catch (err: any) {
          this.logger.warn(`Error processing Socket Mode message: ${err.message}`);
        }
      });

      ws.on('close', () => {
        this.logger.warn(`Socket Mode disconnected for project ${listener.projectId}`);
        listener.ws = null;
        this.scheduleReconnect(listener, onMessage);
      });

      ws.on('error', (err) => {
        this.logger.error(`Socket Mode error for project ${listener.projectId}: ${err.message}`);
      });
    } catch (err: any) {
      this.logger.error(`Failed to connect Socket Mode for project ${listener.projectId}: ${err.message}`);
      this.scheduleReconnect(listener, onMessage);
    }
  }

  private scheduleReconnect(
    listener: SlackListener,
    onMessage: (text: string, slackTs: string, userName: string) => void,
  ): void {
    // Only reconnect if still in activeListeners
    if (!this.activeListeners.has(listener.projectId)) return;

    setTimeout(() => {
      if (this.activeListeners.has(listener.projectId)) {
        this.logger.log(`Reconnecting Socket Mode for project ${listener.projectId}...`);
        this.connectWebSocket(listener, onMessage);
      }
    }, 5000);
  }

  private async slackApi(
    token: string,
    method: string,
    body: Record<string, any>,
  ): Promise<any> {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }
}
