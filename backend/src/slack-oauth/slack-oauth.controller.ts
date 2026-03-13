import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SlackOAuthService } from './slack-oauth.service';

@Controller('slack-oauth')
export class SlackOAuthController {
  constructor(private readonly slackOAuthService: SlackOAuthService) {}

  @Get('install/:agentId')
  async install(@Param('agentId') agentId: string) {
    return this.slackOAuthService.initiateOAuth(agentId);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

    if (error) {
      let agentId = '';
      try {
        agentId = state?.split(':')[1] || '';
      } catch {}
      const redirectUrl = agentId
        ? `${baseUrl}/agents/${agentId}?slack=error&message=${encodeURIComponent(error)}`
        : `${baseUrl}?slack=error&message=${encodeURIComponent(error)}`;
      return res.redirect(redirectUrl);
    }

    if (!code || !state) {
      return res.redirect(`${baseUrl}?slack=error&message=missing_params`);
    }

    try {
      const result = await this.slackOAuthService.handleCallback(code, state);
      return res.redirect(
        `${baseUrl}/agents/${result.agentId}?slack=connected&team=${encodeURIComponent(result.teamName)}`,
      );
    } catch (err: any) {
      const message = err.message || 'unknown_error';
      let agentId = '';
      try {
        agentId = state.split(':')[1] || '';
      } catch {}
      const redirectUrl = agentId
        ? `${baseUrl}/agents/${agentId}?slack=error&message=${encodeURIComponent(message)}`
        : `${baseUrl}?slack=error&message=${encodeURIComponent(message)}`;
      return res.redirect(redirectUrl);
    }
  }

  @Post('disconnect/:agentId')
  async disconnect(@Param('agentId') agentId: string) {
    await this.slackOAuthService.disconnectSlack(agentId);
    return { success: true };
  }

  @Get('status/:agentId')
  async status(@Param('agentId') agentId: string) {
    return this.slackOAuthService.getSlackStatus(agentId);
  }

  @Get('bot-profile/:agentId')
  async getBotProfile(@Param('agentId') agentId: string) {
    return this.slackOAuthService.getBotProfile(agentId);
  }

  @Post('bot-name/:agentId')
  async updateBotName(
    @Param('agentId') agentId: string,
    @Body() body: { displayName: string },
  ) {
    return this.slackOAuthService.updateBotDisplayName(agentId, body.displayName);
  }

  @Post('bot-avatar/:agentId')
  @UseInterceptors(FileInterceptor('image'))
  async uploadBotAvatar(
    @Param('agentId') agentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { ok: false, error: 'No file uploaded' };
    }
    return this.slackOAuthService.uploadBotAvatar(agentId, file.buffer, file.originalname);
  }
}
