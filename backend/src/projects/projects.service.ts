import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectMessage } from './entities/project-message.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AgentsService } from '../agents/agents.service';
import { Subject } from 'rxjs';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  /** Per-project SSE subjects: projectId → Subject */
  private sseSubjects = new Map<string, Subject<ProjectMessage>>();

  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectMessage)
    private messageRepo: Repository<ProjectMessage>,
    private agentsService: AgentsService,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepo.find({
      relations: ['members', 'members.agent'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['members', 'members.agent'],
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({
      name: dto.name,
      goal: dto.goal,
      max_turns: dto.max_turns ?? 50,
      coordinator_agent_id: dto.coordinator_agent_id,
      status: 'draft',
    });
    const saved = await this.projectRepo.save(project);

    if (dto.agent_ids?.length) {
      await this.addMembersInternal(saved.id, dto.agent_ids);
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.goal !== undefined) project.goal = dto.goal;
    if (dto.max_turns !== undefined) project.max_turns = dto.max_turns;
    if (dto.coordinator_agent_id !== undefined) project.coordinator_agent_id = dto.coordinator_agent_id;
    await this.projectRepo.save(project);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    this.sseSubjects.get(id)?.complete();
    this.sseSubjects.delete(id);
    await this.projectRepo.remove(project);
  }

  async addMembers(projectId: string, agentIds: string[]): Promise<Project> {
    await this.findOne(projectId); // verify exists
    await this.addMembersInternal(projectId, agentIds);
    return this.findOne(projectId);
  }

  async removeMember(projectId: string, agentId: string): Promise<Project> {
    await this.findOne(projectId);
    await this.memberRepo.delete({ project_id: projectId, agent_id: agentId });
    return this.findOne(projectId);
  }

  async getMessages(projectId: string, limit = 100, offset = 0): Promise<ProjectMessage[]> {
    await this.findOne(projectId);
    return this.messageRepo.find({
      where: { project_id: projectId },
      order: { created_at: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  async saveMessage(
    projectId: string,
    role: string,
    content: string,
    agentId?: string,
    agentName?: string,
    turnNumber?: number,
  ): Promise<ProjectMessage> {
    const msg = this.messageRepo.create({
      project_id: projectId,
      role,
      content,
      agent_id: agentId,
      agent_name: agentName,
      turn_number: turnNumber ?? 0,
    });
    const saved = await this.messageRepo.save(msg);

    // Push to SSE subject
    this.sseSubjects.get(projectId)?.next(saved);

    return saved;
  }

  getMessageSubject(projectId: string): Subject<ProjectMessage> {
    if (!this.sseSubjects.has(projectId)) {
      this.sseSubjects.set(projectId, new Subject<ProjectMessage>());
    }
    return this.sseSubjects.get(projectId)!;
  }

  async setStatus(id: string, status: string, pauseReason?: string): Promise<Project> {
    const project = await this.findOne(id);
    project.status = status;
    if (pauseReason !== undefined) project.pause_reason = pauseReason;
    return this.projectRepo.save(project);
  }

  async incrementTurn(id: string, agentId?: string): Promise<Project> {
    const project = await this.findOne(id);
    project.current_turn += 1;
    if (agentId) project.current_agent_id = agentId;
    return this.projectRepo.save(project);
  }

  private async addMembersInternal(projectId: string, agentIds: string[]): Promise<void> {
    const existing = await this.memberRepo.find({ where: { project_id: projectId } });
    const existingSet = new Set(existing.map((m) => m.agent_id));
    let maxOrder = existing.reduce((max, m) => Math.max(max, m.order_index), -1);

    for (const agentId of agentIds) {
      if (existingSet.has(agentId)) continue;
      // Verify agent exists
      await this.agentsService.findOne(agentId);
      maxOrder++;
      await this.memberRepo.save({
        project_id: projectId,
        agent_id: agentId,
        order_index: maxOrder,
      });
    }
  }
}
