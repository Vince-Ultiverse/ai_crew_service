import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { AgentLog } from './entities/agent-log.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { DockerService } from '../docker/docker.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(AgentLog)
    private logRepo: Repository<AgentLog>,
    @InjectRepository(ChatMessage)
    private chatRepo: Repository<ChatMessage>,
    private dockerService: DockerService,
  ) {}

  async findAll(): Promise<Agent[]> {
    return this.agentRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id } });
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return agent;
  }

  async create(dto: CreateAgentDto): Promise<Agent> {
    const existingPorts = (await this.agentRepo.find({ select: ['gateway_port'] }))
      .map((a) => a.gateway_port)
      .filter(Boolean);
    const port = await this.dockerService.allocatePort(existingPorts);

    const { template_id, ...rest } = dto;
    const agent = this.agentRepo.create({
      ...rest,
      ...(template_id ? { template_id } : {}),
      status: 'creating',
      gateway_port: port,
    } as Agent);
    const saved = await this.agentRepo.save(agent);

    try {
      const config = this.dockerService.generateOpenClawConfig(saved);
      // Save the generated gateway auth token back to the agent
      if (config.gateway?.auth?.token && !saved.gateway_token) {
        saved.gateway_token = config.gateway.auth.token;
      }
      const agentDir = await this.dockerService.prepareAgentDirectory(saved.slug, config, this.extractWorkspaceFiles(saved), saved.name);
      const containerId = await this.dockerService.createContainer({
        slug: saved.slug,
        agentDir,
        gatewayPort: port,
        memoryLimit: saved.memory_limit,
        cpuLimit: saved.cpu_limit,
        env: this.buildAgentEnv(saved),
      });

      saved.container_id = containerId;
      saved.status = 'stopped';
      await this.agentRepo.save(saved);
      await this.addLog(saved.id, 'info', `Agent created with container ${containerId.substring(0, 12)}`);
    } catch (err: any) {
      saved.status = 'error';
      await this.agentRepo.save(saved);
      await this.addLog(saved.id, 'error', `Failed to create container: ${err.message}`);
      this.logger.error(`Failed to create agent container: ${err.message}`, err.stack);
    }

    return saved;
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);
    const oldMemory = agent.memory_limit;
    const oldCpu = agent.cpu_limit;
    const { template_id, slack_bot_token, slack_app_token, ...rest } = dto;
    Object.assign(agent, rest);
    // Only overwrite tokens if non-empty (prevent form submission from clearing OAuth tokens)
    if (slack_bot_token) agent.slack_bot_token = slack_bot_token;
    if (slack_app_token) agent.slack_app_token = slack_app_token;
    if (template_id) {
      agent.template_id = template_id;
    } else if (template_id === '') {
      agent.template_id = null as any;
    }
    const saved = await this.agentRepo.save(agent);

    // Always regenerate config files on update
    const config = this.dockerService.generateOpenClawConfig(saved);
    await this.dockerService.prepareAgentDirectory(saved.slug, config, this.extractWorkspaceFiles(saved), saved.name);

    // Apply CPU/memory changes to running container via Docker API
    if (saved.container_id && (saved.memory_limit !== oldMemory || saved.cpu_limit !== oldCpu)) {
      try {
        await this.dockerService.updateContainerResources(saved.container_id, saved.memory_limit, saved.cpu_limit);
        await this.addLog(id, 'info', `Container resources updated: memory=${saved.memory_limit}, cpu=${saved.cpu_limit}`);
      } catch (err: any) {
        this.logger.warn(`Failed to update container resources: ${err.message}`);
        await this.addLog(id, 'warn', `Resource update failed (rebuild required): ${err.message}`);
      }
    }

    await this.addLog(id, 'info', 'Agent configuration updated');
    return saved;
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    if (agent.container_id) {
      try {
        await this.dockerService.removeContainer(agent.container_id);
      } catch (err: any) {
        this.logger.warn(`Failed to remove container: ${err.message}`);
      }
    }
    await this.dockerService.cleanupAgentDirectory(agent.slug);
    await this.agentRepo.remove(agent);
  }

  async start(id: string): Promise<Agent> {
    const agent = await this.findOne(id);

    if (!agent.container_id) {
      return this.recreateContainer(agent);
    }

    await this.dockerService.startContainer(agent.container_id);
    agent.status = 'running';
    await this.agentRepo.save(agent);
    await this.addLog(id, 'info', 'Agent started');
    return agent;
  }

  async stop(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    if (!agent.container_id) throw new NotFoundException('Agent has no container');

    await this.dockerService.stopContainer(agent.container_id);
    agent.status = 'stopped';
    await this.agentRepo.save(agent);
    await this.addLog(id, 'info', 'Agent stopped');
    return agent;
  }

  async restart(id: string): Promise<Agent> {
    const agent = await this.findOne(id);

    if (!agent.container_id) {
      return this.recreateContainer(agent);
    }

    // Regenerate config before restart so any config changes take effect
    const config = this.dockerService.generateOpenClawConfig(agent);
    await this.dockerService.prepareAgentDirectory(agent.slug, config, this.extractWorkspaceFiles(agent), agent.name);

    await this.dockerService.restartContainer(agent.container_id);
    agent.status = 'running';
    await this.agentRepo.save(agent);
    await this.addLog(id, 'info', 'Agent restarted');
    return agent;
  }

  async rebuild(id: string): Promise<Agent> {
    const agent = await this.findOne(id);

    // Remove old container if exists
    if (agent.container_id) {
      try {
        await this.dockerService.removeContainer(agent.container_id);
      } catch (err: any) {
        this.logger.warn(`Failed to remove old container: ${err.message}`);
      }
      agent.container_id = null as any;
    }

    // Clean old data and recreate
    await this.dockerService.cleanupAgentDirectory(agent.slug);
    const config = this.dockerService.generateOpenClawConfig(agent);
    if (config.gateway?.auth?.token) {
      agent.gateway_token = config.gateway.auth.token;
    }
    const agentDir = await this.dockerService.prepareAgentDirectory(agent.slug, config, this.extractWorkspaceFiles(agent), agent.name);
    const containerId = await this.dockerService.createContainer({
      slug: agent.slug,
      agentDir,
      gatewayPort: agent.gateway_port,
      memoryLimit: agent.memory_limit,
      cpuLimit: agent.cpu_limit,
      env: this.buildAgentEnv(agent),
    });

    agent.container_id = containerId;
    await this.dockerService.startContainer(containerId);
    agent.status = 'running';
    await this.agentRepo.save(agent);
    await this.addLog(id, 'info', `Container rebuilt and started: ${containerId.substring(0, 12)}`);
    return agent;
  }

  async getLogs(id: string, tail = 100): Promise<string> {
    const agent = await this.findOne(id);
    if (!agent.container_id) return '';
    return this.dockerService.getContainerLogs(agent.container_id, tail);
  }

  async getStatus(id: string): Promise<{ status: string }> {
    const agent = await this.findOne(id);
    if (!agent.container_id) return { status: agent.status };

    const containerStatus = await this.dockerService.getContainerStatus(agent.container_id);
    if (containerStatus !== agent.status) {
      agent.status = containerStatus;
      await this.agentRepo.save(agent);
    }
    return { status: containerStatus };
  }

  async batchDeploy(agents: CreateAgentDto[]): Promise<Agent[]> {
    const results: Agent[] = [];
    for (const dto of agents) {
      const agent = await this.create(dto);
      if (agent.status !== 'error') {
        try {
          await this.start(agent.id);
          results.push(await this.findOne(agent.id));
        } catch {
          results.push(agent);
        }
      } else {
        results.push(agent);
      }
    }
    return results;
  }

  async getStats(): Promise<{
    total: number;
    running: number;
    stopped: number;
    error: number;
  }> {
    const agents = await this.agentRepo.find();
    return {
      total: agents.length,
      running: agents.filter((a) => a.status === 'running').length,
      stopped: agents.filter((a) => a.status === 'stopped').length,
      error: agents.filter((a) => a.status === 'error').length,
    };
  }

  async getChatHistory(agentId: string, limit = 100): Promise<ChatMessage[]> {
    await this.findOne(agentId); // verify agent exists
    return this.chatRepo.find({
      where: { agent_id: agentId },
      order: { created_at: 'ASC' },
      take: limit,
    });
  }

  async saveChatMessages(agentId: string, messages: { role: string; content: string }[]): Promise<void> {
    const entities = messages.map((m) =>
      this.chatRepo.create({ agent_id: agentId, role: m.role, content: m.content }),
    );
    await this.chatRepo.save(entities);
  }

  async clearChatHistory(agentId: string): Promise<void> {
    await this.findOne(agentId);
    await this.chatRepo.delete({ agent_id: agentId });
  }

  private async recreateContainer(agent: Agent): Promise<Agent> {
    const config = this.dockerService.generateOpenClawConfig(agent);
    if (config.gateway?.auth?.token && !agent.gateway_token) {
      agent.gateway_token = config.gateway.auth.token;
    }
    const agentDir = await this.dockerService.prepareAgentDirectory(agent.slug, config, this.extractWorkspaceFiles(agent), agent.name);
    const containerId = await this.dockerService.createContainer({
      slug: agent.slug,
      agentDir,
      gatewayPort: agent.gateway_port,
      memoryLimit: agent.memory_limit,
      cpuLimit: agent.cpu_limit,
      env: this.buildAgentEnv(agent),
    });
    agent.container_id = containerId;
    await this.dockerService.startContainer(containerId);
    agent.status = 'running';
    await this.agentRepo.save(agent);
    await this.addLog(agent.id, 'info', `Container recreated and started: ${containerId.substring(0, 12)}`);
    return agent;
  }

  private extractWorkspaceFiles(agent: Agent): Record<string, string | null> {
    return {
      system_prompt: agent.system_prompt,
      soul_prompt: agent.soul_prompt,
      agents_prompt: agent.agents_prompt,
      user_prompt: agent.user_prompt,
      tools_prompt: agent.tools_prompt,
    };
  }

  private buildAgentEnv(agent: Agent): Record<string, string> {
    const env: Record<string, string> = {};
    if (agent.llm_api_key && agent.llm_provider) {
      const envKeyMap: Record<string, string> = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        'z.ai': 'ZAI_API_KEY',
      };
      const key = envKeyMap[agent.llm_provider] || `${agent.llm_provider.toUpperCase()}_API_KEY`;
      env[key] = agent.llm_api_key;
    }
    if (agent.gateway_token) {
      env['OPENCLAW_GATEWAY_TOKEN'] = agent.gateway_token;
    }
    return env;
  }

  private async addLog(agentId: string, level: string, message: string): Promise<void> {
    await this.logRepo.save({ agent_id: agentId, level, message });
  }
}
