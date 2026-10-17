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
import { Course } from '../../courses/entities/course.entity.js';
import { AcademicTerm } from '../../academic-terms/entities/academic-term.entity.js';
import { TeacherProfile } from '../../teachers/entities/teacher.entity.js';
import { OfferingSchedule } from './offering-schedule.entity.js';
import type { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import type { ClassSession } from '../../class-sessions/entities/class-session.entity.js';
import type { Assessment } from '../../gradebook/entities/assessment.entity.js';

export enum CourseOfferingStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('course_offerings')
export class CourseOffering {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (course) => (course as any).offerings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'courseId' })
  course: Relation<Course>;

  @Index()
  @Column({ type: 'uuid' })
  termId: string;

  @ManyToOne(() => AcademicTerm, (term) => term.offerings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'termId' })
  term: Relation<AcademicTerm>;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  teacherId?: string | null;

  @ManyToOne(() => TeacherProfile, (teacher) => teacher.offerings, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherId' })
  teacher?: Relation<TeacherProfile> | null;

  @Column({ type: 'varchar' })
  section: string; // e.g. "Section A", "Batch 10", "Evening-1"

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  code: string; // e.g. "WD101-SP26-A"

  @Column({ type: 'varchar', default: 'Lab 1' })
  classroom: string;

  @Column({ type: 'int', default: 30 })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  enrolledCount: number;

  @Column({
    type: 'enum',
    enum: CourseOfferingStatus,
    default: CourseOfferingStatus.DRAFT,
  })
  status: CourseOfferingStatus;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  feeOverride?: number | null;

  @OneToMany(() => OfferingSchedule, (schedule) => schedule.offering, { cascade: true })
  schedules: Relation<OfferingSchedule>[];

  @OneToMany('Enrollment', (enrollment: Enrollment) => enrollment.offering)
  enrollments: Relation<Enrollment>[];

  @OneToMany('ClassSession', (session: ClassSession) => session.offering)
  classSessions: Relation<ClassSession>[];

  @OneToMany('Assessment', (assessment: Assessment) => assessment.offering)
  assessments: Relation<Assessment>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
