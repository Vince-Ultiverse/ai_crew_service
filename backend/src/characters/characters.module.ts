import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { Agent } from '../agents/entities/agent.entity';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), AgentsModule],
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule {}
