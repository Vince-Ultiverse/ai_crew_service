import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from '../../templates/entities/template.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 20, default: 'stopped' })
  status: string;

  @Column({ length: 100, nullable: true })
  container_id: string;

  @Column({ length: 255, nullable: true })
  slack_bot_token: string;

  @Column({ length: 255, nullable: true })
  slack_app_token: string;

  @Column({ default: true })
  slack_enabled: boolean;

  @Column({ length: 50, nullable: true })
  slack_team_id: string;

  @Column({ length: 200, nullable: true })
  slack_team_name: string;

  @Column({ length: 50, nullable: true })
  slack_app_id: string;

  @Column({ length: 100, nullable: true, select: false })
  slack_oauth_state: string;

  @Column({ type: 'jsonb', nullable: true, select: false })
  slack_oauth_credentials: Record<string, string>;

  @Column({ length: 50, nullable: true })
  role: string;

  @Column({ length: 50, default: 'anthropic' })
  llm_provider: string;

  @Column({ length: 255, nullable: true })
  llm_api_key: string;

  @Column({ length: 100, nullable: true })
  llm_model: string;

  @Column({ type: 'text', nullable: true })
  system_prompt: string;

  @Column({ type: 'text', nullable: true })
  soul_prompt: string;

  @Column({ type: 'text', nullable: true })
  agents_prompt: string;

  @Column({ type: 'text', nullable: true })
  user_prompt: string;

  @Column({ type: 'text', nullable: true })
  tools_prompt: string;

  @Column({ type: 'jsonb', default: '{}' })
  openclaw_config: Record<string, any>;

  @Column({ type: 'jsonb', default: '[]' })
  skills: string[];

  @Column({ length: 20, default: '512m' })
  memory_limit: string;

  @Column({ type: 'float', default: 0.5 })
  cpu_limit: number;

  @Column({ type: 'int', nullable: true })
  gateway_port: number;

  @Column({ length: 255, nullable: true })
  gateway_token: string;

  @ManyToOne(() => Template, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ nullable: true })
  template_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
