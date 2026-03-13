import { Controller, Get } from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('stats')
  getStats() {
    return this.agentsService.getStats();
  }
}
