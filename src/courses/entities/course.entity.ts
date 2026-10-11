import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Enrollment } from '../../enrollments/entities/enrollment.entity.js';

export enum CourseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: 'General' })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: '3 Months' })
  duration: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalFee: number;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.ACTIVE,
  })
  status: CourseStatus;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
