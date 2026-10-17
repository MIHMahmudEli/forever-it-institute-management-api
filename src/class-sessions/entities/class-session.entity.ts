import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { CourseOffering } from '../../course-offerings/entities/course-offering.entity.js';
import type { AttendanceRecord } from '../../attendance/entities/attendance-record.entity.js';

export enum ClassSessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('class_sessions')
export class ClassSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  offeringId: string;

  @ManyToOne(() => CourseOffering, (offering) => offering.classSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offeringId' })
  offering: Relation<CourseOffering>;

  @Column({ type: 'int' })
  sessionNumber: number; // e.g. Class #1, Class #2

  @Column({ type: 'varchar', default: 'Lecture Session' })
  title: string;

  @Index()
  @Column({ type: 'date' })
  sessionDate: string; // YYYY-MM-DD

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'varchar', nullable: true })
  classroom: string | null;

  @Column({
    type: 'enum',
    enum: ClassSessionStatus,
    default: ClassSessionStatus.SCHEDULED,
  })
  status: ClassSessionStatus;

  @Column({ type: 'text', nullable: true })
  topic: string | null;

  @OneToMany('AttendanceRecord', (att: AttendanceRecord) => att.session)
  attendanceRecords: Relation<AttendanceRecord>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
