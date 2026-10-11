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
} from 'typeorm';
import { Student } from '../../students/entities/student.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Payment } from '../../payments/entities/payment.entity.js';

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  studentId: string;

  @Index()
  @Column()
  courseId: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  enrollmentDate: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  agreedFee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  finalFee: number;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Student, (student) => student.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Course, (course) => course.enrollments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @OneToMany(() => Payment, (payment) => payment.enrollment)
  payments: Payment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
