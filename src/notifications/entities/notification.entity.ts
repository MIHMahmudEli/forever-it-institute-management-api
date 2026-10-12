import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity.js';

export enum NotificationType {
  COURSE_REQUEST = 'COURSE_REQUEST',
  DROP_REQUEST = 'DROP_REQUEST',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_REVERSED = 'PAYMENT_REVERSED',
  ENROLLMENT_APPROVED = 'ENROLLMENT_APPROVED',
  ENROLLMENT_REJECTED = 'ENROLLMENT_REJECTED',
  DROP_REQUEST_REVIEWED = 'DROP_REQUEST_REVIEWED',
  STUDENT_REGISTERED = 'STUDENT_REGISTERED',
  CREDENTIALS_RESET = 'CREDENTIALS_RESET',
  SYSTEM = 'SYSTEM',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: Relation<User> | null;

  @Index()
  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  targetRole: UserRole | null;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', nullable: true })
  link: string | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
