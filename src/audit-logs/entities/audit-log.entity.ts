import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  action: string;

  @Index()
  @Column()
  entityType: string;

  @Index()
  @Column({ nullable: true })
  entityId: string | null;

  @Column()
  performedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
