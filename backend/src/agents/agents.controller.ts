import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.agentsService.start(id);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    return this.agentsService.stop(id);
  }

  @Post(':id/restart')
  restart(@Param('id') id: string) {
    return this.agentsService.restart(id);
  }

  @Post(':id/rebuild')
  rebuild(@Param('id') id: string) {
    return this.agentsService.rebuild(id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Query('tail') tail?: string) {
    return this.agentsService.getLogs(id, tail ? parseInt(tail, 10) : 100);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.agentsService.getStatus(id);
  }

  @Get(':id/chat/history')
  getChatHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.getChatHistory(id, limit ? parseInt(limit, 10) : 100);
  }

  @Delete(':id/chat/history')
  clearChatHistory(@Param('id') id: string) {
    return this.agentsService.clearChatHistory(id);
  }

  @Post(':id/chat')
  async chat(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const agent = await this.agentsService.findOne(id);
    if (!agent.gateway_port) {
      throw new HttpException('Agent has no gateway port', HttpStatus.BAD_REQUEST);
    }

    // Save user message to history
    const userMsg = body.messages?.[body.messages.length - 1];
    if (userMsg?.role === 'user') {
      await this.agentsService.saveChatMessages(id, [userMsg]);
    }

    // Use Docker container name on the shared network (localhost won't work across containers)
    const gatewayUrl = `http://openclaw-${agent.slug}:${agent.gateway_port}/v1/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (agent.gateway_token) {
      headers['Authorization'] = `Bearer ${agent.gateway_token}`;
    }

    const upstream = await fetch(gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: 'openclaw:main', ...body }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      throw new HttpException(text, upstream.status);
    }

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = (upstream.body as any).getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Save assistant response to history
            if (fullContent) {
              await this.agentsService.saveChatMessages(id, [
                { role: 'assistant', content: fullContent },
              ]);
            }
            res.end();
            return;
          }
          // Parse SSE chunks to accumulate full content
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) fullContent += delta;
            } catch {}
          }
          res.write(value);
        }
      };
      pump().catch(() => res.end());
    } else {
      const data = await upstream.json();
      // Save assistant response to history
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        await this.agentsService.saveChatMessages(id, [
          { role: 'assistant', content },
        ]);
      }
      res.json(data);
    }
  }

  @Post('batch-deploy')
  batchDeploy(@Body() agents: CreateAgentDto[]) {
    return this.agentsService.batchDeploy(agents);
  }
}
