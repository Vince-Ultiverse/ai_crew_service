import { IsString, IsOptional, IsInt, IsUUID, Min, Max } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  max_turns?: number;

  @IsOptional()
  @IsUUID('4')
  coordinator_agent_id?: string;

  @IsOptional()
  @IsString()
  slack_channel_id?: string;
}
