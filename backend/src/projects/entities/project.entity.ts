import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { ProjectMessage } from './project-message.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  goal: string;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'int', default: 50 })
  max_turns: number;

  @Column({ type: 'int', default: 0 })
  current_turn: number;

  @Column({ nullable: true })
  current_agent_id: string;

  @Column({ type: 'text', nullable: true })
  pause_reason: string;

  @Column({ nullable: true })
  coordinator_agent_id: string;

  @Column({ length: 50, nullable: true })
  slack_channel_id: string;

  @Column({ length: 200, nullable: true })
  slack_channel_name: string;

  @OneToMany(() => ProjectMember, (m) => m.project, { cascade: true })
  members: ProjectMember[];

  @OneToMany(() => ProjectMessage, (m) => m.project, { cascade: true })
  messages: ProjectMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
