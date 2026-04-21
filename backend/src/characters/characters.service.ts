import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AgentsService } from '../agents/agents.service';
import { CHARACTER_DEFINITIONS, CharacterDefinition } from './character-definitions';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    private agentsService: AgentsService,
  ) {}

  /**
   * List all characters. Returns DB agents for provisioned ones,
   * and basic info from static definitions for unprovisioned ones.
   */
  async list(): Promise<any[]> {
    const provisioned = await this.agentRepo.find({
      where: { agent_type: 'character' },
      order: { name: 'ASC' },
    });

    const provisionedSlugs = new Set(provisioned.map((a) => a.slug));
    const unprovisioned = CHARACTER_DEFINITIONS.filter(
      (d) => !provisionedSlugs.has(d.slug),
    ).map((d) => ({
      id: null,
      slug: d.slug,
      name: d.name,
      name_zh: d.nameZh || null,
      tagline: d.tagline,
      role: d.role,
      status: 'available',
      agent_type: 'character',
    }));

    const result = [
      ...provisioned.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        name_zh: (CHARACTER_DEFINITIONS.find((d) => d.slug === a.slug))?.nameZh || null,
        tagline: a.tagline,
        role: a.role,
        status: a.status,
        agent_type: a.agent_type,
        gateway_port: a.gateway_port,
      })),
      ...unprovisioned,
    ];

    // Sort by the order in CHARACTER_DEFINITIONS
    const slugOrder = CHARACTER_DEFINITIONS.map((d) => d.slug);
    result.sort((a, b) => slugOrder.indexOf(a.slug) - slugOrder.indexOf(b.slug));
    return result;
  }

  /**
   * Find-or-create a character agent and start it.
   */
  async provision(slug: string): Promise<Agent> {
    // Check if already provisioned
    let agent = await this.agentRepo.findOne({
      where: { slug, agent_type: 'character' },
    });

    if (agent) {
      if (agent.status !== 'running') {
        try {
          agent = await this.agentsService.start(agent.id);
        } catch (err: any) {
          this.logger.warn(`Failed to start character ${slug}: ${err.message}`);
        }
      }
      return agent;
    }

    // Look up static definition
    const def = CHARACTER_DEFINITIONS.find((d) => d.slug === slug);
    if (!def) {
      throw new NotFoundException(`Character "${slug}" not found`);
    }

    // Load system_prompt from skill file
    const skillContent = this.loadSkillFile(slug) || def.system_prompt;
    const systemPrompt = skillContent
      ? `# ${def.name} — AI Persona\n\nYou ARE ${def.name}. You must fully embody this persona in every response.\nAlways respond in first person as ${def.name}. Never break character.\nBelow is your complete cognitive framework — internalize it completely and use it to guide all your responses.\n\n${skillContent}`
      : '';

    // Create agent using existing service
    const llmProvider = process.env.CHARACTER_LLM_PROVIDER || 'zai';
    const llmApiKey = process.env.CHARACTER_LLM_API_KEY;
    const llmModel = process.env.CHARACTER_LLM_MODEL || 'glm-5';

    if (!llmApiKey) {
      this.logger.warn('CHARACTER_LLM_API_KEY not set — character agents will not work');
    }

    agent = await this.agentsService.create({
      name: def.name,
      slug: def.slug,
      agent_type: 'character',
      tagline: def.tagline,
      role: def.role,
      system_prompt: systemPrompt,
      llm_provider: llmProvider,
      llm_api_key: llmApiKey,
      llm_model: llmModel,
      memory_limit: '4g',
      cpu_limit: 4,
    });

    // Auto-start
    try {
      agent = await this.agentsService.start(agent.id);
    } catch (err: any) {
      this.logger.error(`Failed to start character ${slug}: ${err.message}`);
    }

    return agent;
  }

  /**
   * Load SKILL.md content from the skills directory.
   * Tries both src/ (dev mode) and dist/ (compiled) locations.
   */
  private loadSkillFile(slug: string): string | null {
    const candidates = [
      path.join(__dirname, 'skills', `${slug}.md`),
      path.join(process.cwd(), 'src', 'characters', 'skills', `${slug}.md`),
    ];
    for (const skillPath of candidates) {
      try {
        return fs.readFileSync(skillPath, 'utf-8');
      } catch {
        // try next
      }
    }
    this.logger.warn(`Skill file not found for ${slug}`);
    return null;
  }
}
