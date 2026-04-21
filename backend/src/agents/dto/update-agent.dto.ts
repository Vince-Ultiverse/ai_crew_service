import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, IsArray } from 'class-validator';

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  agent_type?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  slack_bot_token?: string;

  @IsOptional()
  @IsString()
  slack_app_token?: string;

  @IsOptional()
  @IsBoolean()
  slack_enabled?: boolean;

  @IsOptional()
  @IsString()
  llm_provider?: string;

  @IsOptional()
  @IsString()
  llm_api_key?: string;

  @IsOptional()
  @IsString()
  llm_model?: string;

  @IsOptional()
  @IsString()
  system_prompt?: string;

  @IsOptional()
  @IsString()
  soul_prompt?: string;

  @IsOptional()
  @IsString()
  agents_prompt?: string;

  @IsOptional()
  @IsString()
  user_prompt?: string;

  @IsOptional()
  @IsString()
  tools_prompt?: string;

  @IsOptional()
  @IsObject()
  openclaw_config?: Record<string, any>;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsString()
  memory_limit?: string;

  @IsOptional()
  @IsNumber()
  cpu_limit?: number;

  @IsOptional()
  @IsString()
  template_id?: string;
}
