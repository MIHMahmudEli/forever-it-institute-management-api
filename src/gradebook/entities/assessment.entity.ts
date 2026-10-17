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
import type { Grade } from './grade.entity.js';

export enum AssessmentType {
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  PROJECT = 'PROJECT',
  PARTICIPATION = 'PARTICIPATION',
  OTHER = 'OTHER',
}

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  offeringId: string;

  @ManyToOne(() => CourseOffering, (offering) => offering.assessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offeringId' })
  offering: Relation<CourseOffering>;

  @Column({ type: 'varchar' })
  title: string;

  @Column({
    type: 'enum',
    enum: AssessmentType,
    default: AssessmentType.ASSIGNMENT,
  })
  type: AssessmentType;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 100 })
  totalMarks: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 10 })
  weightage: number; // percentage (0-100)

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @OneToMany('Grade', (grade: Grade) => grade.assessment)
  grades: Relation<Grade>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
