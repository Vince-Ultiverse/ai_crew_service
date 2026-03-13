import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
