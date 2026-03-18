import { IsString, IsOptional, IsUUID, IsIn, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['not_started', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsUUID()
  assignee_agent_id?: string;
}
