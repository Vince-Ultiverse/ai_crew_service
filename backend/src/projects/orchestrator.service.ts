import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from './projects.service';
import { AgentsService } from '../agents/agents.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';

const MAX_CONTEXT_MESSAGES = 30;
const MAX_CONSECUTIVE_SAME_AGENT = 5;
const TURN_DELAY_MS = 2000;
const AGENT_CALL_TIMEOUT_MS = 120_000;

@Injectable()
export class OrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);

  /** Concurrency lock: only one loop per project */
  private running = new Map<string, boolean>();

  constructor(
    private projectsService: ProjectsService,
    private agentsService: AgentsService,
    @InjectRepository(ProjectMember)
    private memberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  /** On server restart, reset any projects stuck in 'running' state */
  async onModuleInit(): Promise<void> {
    const stuck = await this.projectRepo.find({ where: { status: 'running' } });
    for (const project of stuck) {
      project.status = 'paused';
      project.pause_reason = 'Server restarted';
      await this.projectRepo.save(project);
      this.logger.warn(`Project "${project.name}" reset to paused after server restart`);
    }
  }

  async startLoop(projectId: string): Promise<void> {
    if (this.running.get(projectId)) {
      this.logger.warn(`Loop already running for project ${projectId}`);
      return;
    }
    this.running.set(projectId, true);
    this.runLoop(projectId).catch((err) => {
      this.logger.error(`Orchestrator loop crashed for ${projectId}: ${err.message}`, err.stack);
      this.running.delete(projectId);
    });
  }

  stopLoop(projectId: string): void {
    this.running.delete(projectId);
  }

  isRunning(projectId: string): boolean {
    return this.running.get(projectId) === true;
  }

  private async runLoop(projectId: string): Promise<void> {
    while (this.running.get(projectId)) {
      try {
        const project = await this.projectsService.findOne(projectId);

        // Guard: status check
        if (project.status !== 'running') {
          this.logger.log(`Project ${projectId} status is ${project.status}, stopping loop`);
          break;
        }

        // Guard: max turns
        if (project.current_turn >= project.max_turns) {
          await this.projectsService.setStatus(projectId, 'completed');
          await this.projectsService.saveMessage(
            projectId, 'system', `Max turns (${project.max_turns}) reached. Project completed.`,
          );
          break;
        }

        // Get recent messages (enough for context window + safety checks)
        const messages = await this.projectsService.getMessages(projectId, MAX_CONTEXT_MESSAGES + 10);
        const lastMsg = messages[messages.length - 1];

        // Check for [DONE] signal
        if (lastMsg?.role === 'assistant' && lastMsg.content?.includes('[DONE]')) {
          await this.projectsService.setStatus(projectId, 'completed');
          await this.projectsService.saveMessage(
            projectId, 'system', 'An agent signaled [DONE]. Project completed.',
          );
          break;
        }

        // Check for @User — pause and wait for user input
        if (lastMsg?.role === 'assistant' && /\b@User\b/i.test(lastMsg.content || '')) {
          await this.projectsService.setStatus(projectId, 'paused', 'Waiting for user input');
          await this.projectsService.saveMessage(
            projectId, 'system',
            `${lastMsg.agent_name || 'An agent'} is asking for your input. Please reply to continue.`,
          );
          break;
        }

        // Select next agent
        const members = project.members?.filter((m) => m.agent) || [];
        if (members.length === 0) {
          await this.projectsService.setStatus(projectId, 'paused', 'No active members in project');
          await this.projectsService.saveMessage(projectId, 'system', 'No members available. Project paused.');
          break;
        }

        const nextMember = await this.selectNextAgent(project, members, messages);
        if (!nextMember) {
          await this.projectsService.setStatus(projectId, 'paused', 'Could not determine next agent');
          break;
        }

        const agent = nextMember.agent;

        // Check agent is running
        if (agent.status !== 'running' || !agent.gateway_port) {
          await this.projectsService.setStatus(
            projectId, 'paused',
            `Agent "${agent.name}" is not running (status: ${agent.status})`,
          );
          await this.projectsService.saveMessage(
            projectId, 'system',
            `Agent "${agent.name}" is not available. Project paused.`,
          );
          break;
        }

        // Check consecutive same-agent
        const recentAgentMsgs = [...messages].reverse()
          .filter((m) => m.role === 'assistant')
          .slice(0, MAX_CONSECUTIVE_SAME_AGENT);
        if (
          recentAgentMsgs.length >= MAX_CONSECUTIVE_SAME_AGENT &&
          recentAgentMsgs.every((m) => m.agent_id === agent.id)
        ) {
          await this.projectsService.setStatus(
            projectId, 'paused',
            `Agent "${agent.name}" spoke ${MAX_CONSECUTIVE_SAME_AGENT} times in a row`,
          );
          await this.projectsService.saveMessage(
            projectId, 'system',
            `Warning: "${agent.name}" has been speaking repeatedly. Project paused.`,
          );
          break;
        }

        // Build prompt and call agent
        const chatMessages = this.buildPrompt(project, members, messages, agent.id, agent.name);

        try {
          const reply = await this.callAgent(agent, chatMessages);

          // Success: reset failures and persist
          nextMember.consecutive_failures = 0;
          await this.memberRepo.save(nextMember);
          await this.projectsService.incrementTurn(projectId, agent.id);
          await this.projectsService.saveMessage(
            projectId, 'assistant', reply,
            agent.id, agent.name, project.current_turn + 1,
          );
        } catch (err: any) {
          this.logger.error(`Agent "${agent.name}" failed: ${err.message}`);
          const errMsg = err.message || '';

          // Unrecoverable errors — pause immediately, no retry
          const fatal = /no response from openclaw|ECONNREFUSED|ENOTFOUND|timed out/i.test(errMsg);
          if (fatal) {
            await this.projectsService.setStatus(
              projectId, 'paused',
              `Agent "${agent.name}" is unreachable: ${errMsg}`,
            );
            await this.projectsService.saveMessage(
              projectId, 'system',
              `Agent "${agent.name}" is not responding. Please check if the agent is running, then resume.\nError: ${errMsg}`,
            );
            break;
          }

          // Retryable errors
          nextMember.consecutive_failures += 1;
          await this.memberRepo.save(nextMember);

          if (nextMember.consecutive_failures >= 3) {
            await this.projectsService.setStatus(
              projectId, 'paused',
              `Agent "${agent.name}" failed 3 times: ${errMsg}`,
            );
            await this.projectsService.saveMessage(
              projectId, 'system',
              `Agent "${agent.name}" failed 3 consecutive times. Project paused.\nError: ${errMsg}`,
            );
            break;
          } else {
            await this.projectsService.saveMessage(
              projectId, 'system',
              `Agent "${agent.name}" failed (attempt ${nextMember.consecutive_failures}/3): ${errMsg}. Retrying...`,
            );
            // Continue loop immediately to retry
            continue;
          }
        }

        // Delay before next turn
        await this.delay(TURN_DELAY_MS);
      } catch (err: any) {
        this.logger.error(`Orchestrator error: ${err.message}`, err.stack);
        try {
          await this.projectsService.setStatus(projectId, 'paused', `Orchestrator error: ${err.message}`);
        } catch {}
        break;
      }
    }

    this.running.delete(projectId);
    this.logger.log(`Orchestrator loop ended for project ${projectId}`);
  }

  private async selectNextAgent(
    project: Project,
    members: ProjectMember[],
    messages: { role: string; agent_id?: string; content: string }[],
  ): Promise<ProjectMember | null> {
    const sorted = [...members].sort((a, b) => a.order_index - b.order_index);
    const lastMsg = messages[messages.length - 1];

    // Check @mention in last message (word boundary to avoid partial matches)
    if (lastMsg?.content) {
      for (const member of sorted) {
        const name = member.agent?.name;
        if (name && new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lastMsg.content)) {
          return member;
        }
      }
    }

    // Round-robin: find current agent index, pick next
    if (project.current_agent_id) {
      const currentIdx = sorted.findIndex((m) => m.agent_id === project.current_agent_id);
      if (currentIdx >= 0) {
        return sorted[(currentIdx + 1) % sorted.length];
      }
    }

    // Default: first agent
    return sorted[0] || null;
  }

  private buildPrompt(
    project: Project,
    members: ProjectMember[],
    messages: { role: string; agent_id?: string; agent_name?: string; content: string }[],
    currentAgentId: string,
    currentAgentName: string,
  ): { role: string; content: string }[] {
    const memberList = members
      .map((m) => `- ${m.agent?.name} (${m.agent?.role || 'team member'})`)
      .join('\n');

    const systemPrompt = [
      `You are ${currentAgentName}, participating in a team project called "${project.name}".`,
      project.goal ? `\nProject Goal: ${project.goal}` : '',
      `\nTeam Members:\n${memberList}`,
      `\nInstructions:`,
      `- Collaborate with your team to achieve the project goal.`,
      `- Use @Name to direct a message to a specific team member.`,
      `- Use @User when you need input, clarification, or a decision from the human user. The conversation will pause until they reply.`,
      `- When the project goal is fully achieved, include [DONE] in your message.`,
      `- Stay focused on your role and expertise.`,
      `- Build on what others have said; avoid repeating.`,
    ].filter(Boolean).join('\n');

    // Sliding window: keep recent messages
    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

    // Convert messages: current agent's messages → assistant, others → user
    const chatMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of recentMessages) {
      if (msg.role === 'system') {
        chatMessages.push({ role: 'user', content: `[System] ${msg.content}` });
      } else if (msg.role === 'user') {
        chatMessages.push({ role: 'user', content: `[User] ${msg.content}` });
      } else if (msg.agent_id === currentAgentId) {
        chatMessages.push({ role: 'assistant', content: msg.content });
      } else {
        const name = msg.agent_name || 'Unknown';
        chatMessages.push({ role: 'user', content: `[${name}] ${msg.content}` });
      }
    }

    return chatMessages;
  }

  private async callAgent(
    agent: { slug: string; gateway_port: number; gateway_token?: string },
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const url = `http://openclaw-${agent.slug}:${agent.gateway_port}/v1/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (agent.gateway_token) {
      headers['Authorization'] = `Bearer ${agent.gateway_token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AGENT_CALL_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'openclaw:main',
          messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenClaw API ${response.status}: ${text}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from agent');
      }
      return content;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Agent request timed out after 2 minutes');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
