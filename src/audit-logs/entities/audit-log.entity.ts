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
  @Column({ type: 'varchar' })
  action: string;

  @Index()
  @Column({ type: 'varchar' })
  entityType: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar' })
  performedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
