import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Sse,
  BadRequestException,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ProjectsService } from './projects.service';
import { OrchestratorService } from './orchestrator.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.orchestratorService.stopLoop(id);
    return this.projectsService.remove(id);
  }

  @Post(':id/members')
  addMembers(@Param('id') id: string, @Body() body: { agent_ids: string[] }) {
    if (!body.agent_ids?.length) throw new BadRequestException('agent_ids required');
    return this.projectsService.addMembers(id, body.agent_ids);
  }

  @Delete(':id/members/:agentId')
  removeMember(@Param('id') id: string, @Param('agentId') agentId: string) {
    return this.projectsService.removeMember(id, agentId);
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    const project = await this.projectsService.findOne(id);
    if (project.status === 'running') {
      throw new BadRequestException('Project is already running');
    }
    if (!project.members?.length) {
      throw new BadRequestException('Project has no members');
    }
    await this.projectsService.setStatus(id, 'running');
    await this.projectsService.saveMessage(id, 'system', 'Project started. Agents are collaborating...');
    this.orchestratorService.startLoop(id);
    return this.projectsService.findOne(id);
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    this.orchestratorService.stopLoop(id);
    await this.projectsService.setStatus(id, 'paused', 'Paused by user');
    await this.projectsService.saveMessage(id, 'system', 'Project paused by user.');
    return this.projectsService.findOne(id);
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    const project = await this.projectsService.findOne(id);
    if (project.status !== 'paused') {
      throw new BadRequestException('Project is not paused');
    }
    await this.projectsService.setStatus(id, 'running');
    await this.projectsService.saveMessage(id, 'system', 'Project resumed.');
    this.orchestratorService.startLoop(id);
    return this.projectsService.findOne(id);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string) {
    this.orchestratorService.stopLoop(id);
    await this.projectsService.setStatus(id, 'completed');
    await this.projectsService.saveMessage(id, 'system', 'Project marked as completed by user.');
    return this.projectsService.findOne(id);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.projectsService.getMessages(
      id,
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.projectsService.saveMessage(id, 'user', dto.content);
  }

  @Sse(':id/messages/stream')
  messageStream(@Param('id') id: string): Observable<MessageEvent> {
    const subject = this.projectsService.getMessageSubject(id);
    return subject.pipe(
      map((msg) => ({
        data: JSON.stringify(msg),
      } as MessageEvent)),
    );
  }
}
