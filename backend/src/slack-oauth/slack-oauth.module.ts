import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Setting } from '../settings/settings.entity';
import { SlackOAuthController } from './slack-oauth.controller';
import { SlackOAuthService } from './slack-oauth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Setting])],
  controllers: [SlackOAuthController],
  providers: [SlackOAuthService],
  exports: [SlackOAuthService],
})
export class SlackOAuthModule {}
