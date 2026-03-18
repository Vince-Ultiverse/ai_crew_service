import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assignee_agent_id?: string;
}
