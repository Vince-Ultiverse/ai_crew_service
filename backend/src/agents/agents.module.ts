import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { AgentLog } from './entities/agent-log.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { DockerModule } from '../docker/docker.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, AgentLog, ChatMessage]), DockerModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
