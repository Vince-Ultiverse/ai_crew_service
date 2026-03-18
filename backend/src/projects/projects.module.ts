import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { OrchestratorService } from './orchestrator.service';
import { SlackProjectService } from './slack-project.service';
import { TaskService } from './task.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectMessage } from './entities/project-message.entity';
import { ProjectTask } from './entities/project-task.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, ProjectMessage, ProjectTask, Agent]),
    AgentsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, OrchestratorService, SlackProjectService, TaskService],
  exports: [ProjectsService, TaskService],
})
export class ProjectsModule {}
