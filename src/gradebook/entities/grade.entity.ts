import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  type Relation,
} from 'typeorm';
import { Assessment } from './assessment.entity.js';
import { Student } from '../../students/entities/student.entity.js';

export enum GradeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PUBLISHED = 'PUBLISHED',
}

@Entity('grades')
@Unique(['assessmentId', 'studentId'])
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  assessmentId: string;

  @ManyToOne(() => Assessment, (assessment) => assessment.grades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Relation<Assessment>;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Relation<Student>;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  obtainedMarks: number;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({
    type: 'enum',
    enum: GradeStatus,
    default: GradeStatus.DRAFT,
  })
  status: GradeStatus;

  @Column({ type: 'uuid', nullable: true })
  gradedBy: string | null; // Teacher user ID

  @Column({ type: 'timestamp with time zone', nullable: true })
  gradedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
