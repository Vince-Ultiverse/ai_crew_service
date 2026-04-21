import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AgentsModule } from './agents/agents.module';
import { TemplatesModule } from './templates/templates.module';
import { DockerModule } from './docker/docker.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SlackOAuthModule } from './slack-oauth/slack-oauth.module';
import { ProjectsModule } from './projects/projects.module';
import { CharactersModule } from './characters/characters.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig()),
    AgentsModule,
    TemplatesModule,
    DockerModule,
    HealthModule,
    DashboardModule,
    SlackOAuthModule,
    ProjectsModule,
    CharactersModule,
  ],
})
export class AppModule {}
