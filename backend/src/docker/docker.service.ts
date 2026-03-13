import { Injectable, Logger } from '@nestjs/common';
import Docker = require('dockerode');
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'alpine/openclaw:latest';
const NETWORK_NAME = process.env.DOCKER_NETWORK || 'ai_crew_network';
const DATA_DIR = path.resolve(__dirname, '../../data/agents');
const SHARED_DIR = path.resolve(__dirname, '../../shared');
// HOST_DATA_DIR: host-side absolute path for Docker bind mounts (needed when backend runs in a container)
const HOST_DATA_DIR = process.env.HOST_DATA_DIR
  ? path.join(process.env.HOST_DATA_DIR, 'agents')
  : DATA_DIR;
const PORT_START = 19000;

function findDockerSocket(): string {
  const candidates = [
    process.env.DOCKER_HOST?.replace('unix://', ''),
    '/var/run/docker.sock',
    `${process.env.HOME}/.docker/run/docker.sock`,
  ].filter(Boolean) as string[];
  for (const sock of candidates) {
    if (fs.existsSync(sock)) return sock;
  }
  return '/var/run/docker.sock';
}

@Injectable()
export class DockerService {
  private docker: Docker;
  private readonly logger = new Logger(DockerService.name);

  constructor() {
    const socketPath = findDockerSocket();
    this.logger.log(`Using Docker socket: ${socketPath}`);
    this.docker = new Docker({ socketPath });
  }

  async ensureNetwork(): Promise<void> {
    try {
      const network = this.docker.getNetwork(NETWORK_NAME);
      await network.inspect();
    } catch {
      this.logger.log(`Creating Docker network: ${NETWORK_NAME}`);
      await this.docker.createNetwork({ Name: NETWORK_NAME, Driver: 'bridge' });
    }
  }

  async allocatePort(existingPorts: number[]): Promise<number> {
    let port = PORT_START;
    while (existingPorts.includes(port)) {
      port++;
    }
    return port;
  }

  generateOpenClawConfig(agent: {
    name: string;
    slack_bot_token?: string;
    slack_app_token?: string;
    slack_enabled?: boolean;
    llm_provider?: string;
    llm_api_key?: string;
    llm_model?: string;
    system_prompt?: string;
    openclaw_config?: Record<string, any>;
    skills?: string[];
    gateway_port?: number;
    gateway_token?: string;
  }): Record<string, any> {
    const config: Record<string, any> = {
      ...agent.openclaw_config,
    };

    // Model config: agents.defaults.model.primary = "provider/model-id"
    if (agent.llm_provider || agent.llm_model) {
      config.agents = config.agents || {};
      config.agents.defaults = config.agents.defaults || {};
      // Strip date suffix (e.g. "claude-sonnet-4-5-20250929" → "claude-sonnet-4-5") to avoid OpenClaw parse bug
      const model = (agent.llm_model || 'claude-sonnet-4-5').replace(/-\d{8}$/, '');
      const provider = agent.llm_provider || 'anthropic';
      // Format: "provider/model-id"
      config.agents.defaults.model = { primary: `${provider}/${model}` };
    }

    // API keys via env section (inline env vars)
    if (agent.llm_api_key && agent.llm_provider) {
      config.env = config.env || {};
      const envKeyMap: Record<string, string> = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        'z.ai': 'ZAI_API_KEY',
        ollama: 'OLLAMA_API_KEY',
      };
      const envKey = envKeyMap[agent.llm_provider] || `${agent.llm_provider.toUpperCase()}_API_KEY`;
      config.env[envKey] = agent.llm_api_key;
    }

    // Slack config: channels.slack (NOT top-level "slack")
    if (agent.slack_enabled && agent.slack_bot_token) {
      config.channels = config.channels || {};
      config.channels.slack = config.channels.slack || {};
      config.channels.slack.enabled = true;
      config.channels.slack.botToken = agent.slack_bot_token;
      if (agent.slack_app_token) {
        config.channels.slack.appToken = agent.slack_app_token;
      }
    }

    // Agent identity (display name only; system prompt goes to IDENTITY.md)
    config.agents = config.agents || {};
    config.agents.list = config.agents.list || [{ id: 'main' }];
    const mainAgent = config.agents.list.find((a: any) => a.id === 'main') || config.agents.list[0];
    mainAgent.identity = mainAgent.identity || {};
    mainAgent.identity.name = agent.name;

    if (agent.skills && agent.skills.length > 0) {
      config.skills = agent.skills;
    }

    // Gateway config
    if (agent.gateway_port) {
      config.gateway = config.gateway || {};
      config.gateway.port = agent.gateway_port;
      config.gateway.bind = 'lan';
      // Auth token is REQUIRED for non-loopback bind
      config.gateway.auth = config.gateway.auth || {};
      config.gateway.auth.mode = 'token';
      config.gateway.auth.token = agent.gateway_token || crypto.randomBytes(24).toString('hex');
      config.gateway.controlUi = config.gateway.controlUi || {};
      config.gateway.controlUi.enabled = true;
      // Skip device pairing for Docker bridge connections
      config.gateway.controlUi.dangerouslyDisableDeviceAuth = true;
      // Allow HTTP token auth (non-HTTPS)
      config.gateway.controlUi.allowInsecureAuth = true;
      // allowedOrigins required for bind=lan since v2026.2.26
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
      config.gateway.controlUi.allowedOrigins = [
        `http://localhost:${agent.gateway_port}`,
        `http://127.0.0.1:${agent.gateway_port}`,
        appBaseUrl,
      ];
      // Enable OpenAI-compatible HTTP API (disabled by default)
      config.gateway.http = config.gateway.http || {};
      config.gateway.http.endpoints = config.gateway.http.endpoints || {};
      config.gateway.http.endpoints.chatCompletions = { enabled: true };
    }

    return config;
  }

  private static sharedProtocolsCache: string | null = null;

  static loadSharedProtocols(): string {
    if (DockerService.sharedProtocolsCache !== null) return DockerService.sharedProtocolsCache;
    if (!fs.existsSync(SHARED_DIR)) {
      DockerService.sharedProtocolsCache = '';
      return '';
    }
    const parts: string[] = [];
    for (const file of fs.readdirSync(SHARED_DIR).sort()) {
      if (!file.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(SHARED_DIR, file), 'utf-8').trim();
      if (content) parts.push(content);
    }
    DockerService.sharedProtocolsCache = parts.length
      ? '\n\n---\n\n# 共享协议（全员必读）\n\n' + parts.join('\n\n---\n\n')
      : '';
    return DockerService.sharedProtocolsCache;
  }

  private static readonly WORKSPACE_FILE_MAP: Record<string, string> = {
    system_prompt: 'IDENTITY.md',
    soul_prompt: 'SOUL.md',
    agents_prompt: 'AGENTS.md',
    user_prompt: 'USER.md',
    tools_prompt: 'TOOLS.md',
  };

  async prepareAgentDirectory(
    slug: string,
    config: Record<string, any>,
    workspaceFiles?: Partial<Record<string, string | null>>,
    agentName?: string,
  ): Promise<string> {
    const agentDir = path.join(DATA_DIR, slug);
    const configDir = path.join(agentDir, 'config');
    const workspaceDir = path.join(agentDir, 'workspace');

    fs.mkdirSync(configDir, { recursive: true });
    fs.chmodSync(configDir, 0o777);
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.chmodSync(workspaceDir, 0o777);

    const configPath = path.join(configDir, 'openclaw.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Write workspace files (IDENTITY.md, SOUL.md, AGENTS.md, USER.md, TOOLS.md)
    // Replace {{name}} placeholder with actual agent name
    if (workspaceFiles) {
      for (const [field, filename] of Object.entries(DockerService.WORKSPACE_FILE_MAP)) {
        const filePath = path.join(workspaceDir, filename);
        let content = workspaceFiles[field];
        if (content) {
          if (agentName) {
            content = content.replace(/\{\{name\}\}/g, agentName);
          }
          // Append shared governance protocols to AGENTS.md
          if (field === 'agents_prompt') {
            content += DockerService.loadSharedProtocols();
          }
          fs.writeFileSync(filePath, content);
        } else if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    return agentDir;
  }

  async createContainer(params: {
    slug: string;
    agentDir: string;
    gatewayPort: number;
    memoryLimit: string;
    cpuLimit: number;
    env?: Record<string, string>;
  }): Promise<string> {
    await this.ensureNetwork();

    const memoryBytes = this.parseMemoryLimit(params.memoryLimit);

    const container = await this.docker.createContainer({
      Image: OPENCLAW_IMAGE,
      name: `openclaw-${params.slug}`,
      HostConfig: {
        Binds: [
          `${path.join(HOST_DATA_DIR, params.slug, 'config')}:/home/node/.openclaw`,
          `${path.join(HOST_DATA_DIR, params.slug, 'workspace')}:/home/node/.openclaw/workspace`,
        ],
        Memory: memoryBytes,
        NanoCpus: Math.floor(params.cpuLimit * 1e9),
        RestartPolicy: { Name: 'unless-stopped' },
        PortBindings: {
          [`${params.gatewayPort}/tcp`]: [{ HostPort: String(params.gatewayPort) }],
        },
        NetworkMode: NETWORK_NAME,
      },
      Env: [
        `OPENCLAW_GATEWAY_PORT=${params.gatewayPort}`,
        ...Object.entries(params.env || {}).map(([k, v]) => `${k}=${v}`),
      ],
      ExposedPorts: {
        [`${params.gatewayPort}/tcp`]: {},
      },
    });

    return container.id;
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  async updateContainerResources(containerId: string, memoryLimit: string, cpuLimit: number): Promise<void> {
    const container = this.docker.getContainer(containerId);
    const memoryBytes = this.parseMemoryLimit(memoryLimit);
    await container.update({
      Memory: memoryBytes,
      MemorySwap: memoryBytes * 2,
      NanoCpus: Math.floor(cpuLimit * 1e9),
    } as any);
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop({ t: 10 });
    } catch (err: any) {
      if (err.statusCode !== 304) throw err; // already stopped
    }
  }

  async restartContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.restart({ t: 10 });
  }

  async removeContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop({ t: 5 });
    } catch {
      // may already be stopped
    }
    await container.remove({ force: true });
  }

  async getContainerStatus(containerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Running ? 'running' : 'stopped';
    } catch {
      return 'error';
    }
  }

  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    // dockerode returns a Buffer with Docker multiplexed stream headers
    // Each frame: [stream_type(1B), 0, 0, 0, size(4B big-endian), payload(size bytes)]
    const buf = Buffer.isBuffer(logs) ? logs : Buffer.from(logs as any);
    return this.stripDockerStreamHeaders(buf);
  }

  private stripDockerStreamHeaders(buf: Buffer): string {
    const chunks: string[] = [];
    let offset = 0;
    while (offset < buf.length) {
      if (offset + 8 > buf.length) {
        // Not enough bytes for a header, treat rest as raw text
        chunks.push(buf.slice(offset).toString('utf8'));
        break;
      }
      const size = buf.readUInt32BE(offset + 4);
      offset += 8;
      if (size === 0) continue;
      const end = Math.min(offset + size, buf.length);
      chunks.push(buf.slice(offset, end).toString('utf8'));
      offset = end;
    }
    return chunks.join('');
  }

  async cleanupAgentDirectory(slug: string): Promise<void> {
    const agentDir = path.join(DATA_DIR, slug);
    if (fs.existsSync(agentDir)) {
      fs.rmSync(agentDir, { recursive: true, force: true });
    }
  }

  async pullImage(): Promise<void> {
    this.logger.log(`Pulling image: ${OPENCLAW_IMAGE}`);
    return new Promise((resolve, reject) => {
      this.docker.pull(OPENCLAW_IMAGE, {}, (err: any, stream: any) => {
        if (err) return reject(err);
        if (!stream) return reject(new Error('No stream returned'));
        this.docker.modem.followProgress(stream, (err2: any) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  }

  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)(m|g)$/i);
    if (!match) return 512 * 1024 * 1024;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    return unit === 'g' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024;
  }
}
