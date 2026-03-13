import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, default: 'anthropic' })
  llm_provider: string;

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

  @Column({ length: 50, nullable: true })
  role: string;

  @Column({ default: false })
  is_default: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
