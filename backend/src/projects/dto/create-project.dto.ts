import { IsString, IsOptional, IsInt, IsArray, IsUUID, Min, Max } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  max_turns?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  agent_ids?: string[];

  @IsOptional()
  @IsUUID('4')
  coordinator_agent_id?: string;

  @IsOptional()
  @IsString()
  slack_channel_id?: string;
}
