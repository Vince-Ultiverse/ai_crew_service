import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { ProjectTask } from './entities/project-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export interface TaskEvent {
  type: 'created' | 'updated' | 'deleted';
  task: ProjectTask;
}

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  private sseSubjects = new Map<string, Subject<TaskEvent>>();

  constructor(
    @InjectRepository(ProjectTask)
    private taskRepo: Repository<ProjectTask>,
  ) {}

  getSubject(projectId: string): Subject<TaskEvent> {
    if (!this.sseSubjects.has(projectId)) {
      this.sseSubjects.set(projectId, new Subject<TaskEvent>());
    }
    return this.sseSubjects.get(projectId)!;
  }

  async findAllByProject(projectId: string): Promise<ProjectTask[]> {
    return this.taskRepo.find({
      where: { project_id: projectId },
      order: { task_number: 'ASC' },
      relations: ['assignee_agent', 'created_by_agent'],
    });
  }

  async findByNumber(projectId: string, taskNumber: number): Promise<ProjectTask | null> {
    return this.taskRepo.findOne({
      where: { project_id: projectId, task_number: taskNumber },
      relations: ['assignee_agent', 'created_by_agent'],
    });
  }

  async create(
    projectId: string,
    dto: CreateTaskDto,
    createdByAgentId?: string,
    createdByUser = false,
  ): Promise<ProjectTask> {
    const maxResult = await this.taskRepo
      .createQueryBuilder('t')
      .select('MAX(t.task_number)', 'max')
      .where('t.project_id = :projectId', { projectId })
      .getRawOne();
    const nextNumber = (maxResult?.max || 0) + 1;

    const task = new ProjectTask();
    task.project_id = projectId;
    task.task_number = nextNumber;
    task.title = dto.title;
    if (dto.description) task.description = dto.description;
    if (dto.assignee_agent_id) task.assignee_agent_id = dto.assignee_agent_id;
    if (createdByAgentId) task.created_by_agent_id = createdByAgentId;
    task.created_by_user = createdByUser;

    const saved = await this.taskRepo.save(task);
    const full = await this.findByNumber(projectId, saved.task_number);
    this.getSubject(projectId).next({ type: 'created', task: full! });
    return full!;
  }

  async update(projectId: string, taskId: string, dto: UpdateTaskDto): Promise<ProjectTask> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, project_id: projectId },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.assignee_agent_id !== undefined) task.assignee_agent_id = dto.assignee_agent_id;

    await this.taskRepo.save(task);
    const full = (await this.findByNumber(projectId, task.task_number))!;
    this.getSubject(projectId).next({ type: 'updated', task: full });
    return full;
  }

  async updateByNumber(projectId: string, taskNumber: number, dto: UpdateTaskDto): Promise<ProjectTask> {
    const task = await this.taskRepo.findOne({
      where: { project_id: projectId, task_number: taskNumber },
    });
    if (!task) throw new NotFoundException(`Task #${taskNumber} not found`);
    return this.update(projectId, task.id, dto);
  }

  async remove(projectId: string, taskId: string): Promise<ProjectTask> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, project_id: projectId },
      relations: ['assignee_agent', 'created_by_agent'],
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.taskRepo.remove(task);
    // Preserve id for the event (TypeORM clears it on remove)
    task.id = taskId;
    this.getSubject(projectId).next({ type: 'deleted', task });
    return task;
  }

  async removeByNumber(projectId: string, taskNumber: number): Promise<ProjectTask> {
    const task = await this.taskRepo.findOne({
      where: { project_id: projectId, task_number: taskNumber },
    });
    if (!task) throw new NotFoundException(`Task #${taskNumber} not found`);
    return this.remove(projectId, task.id);
  }
}
