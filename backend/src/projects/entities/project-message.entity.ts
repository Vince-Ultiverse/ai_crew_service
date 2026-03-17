import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_messages')
export class ProjectMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (p) => p.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column({ length: 20 })
  role: string;

  @Column({ nullable: true })
  agent_id: string;

  @Column({ length: 100, nullable: true })
  agent_name: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  turn_number: number;

  @Column({ length: 50, nullable: true })
  slack_ts: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
