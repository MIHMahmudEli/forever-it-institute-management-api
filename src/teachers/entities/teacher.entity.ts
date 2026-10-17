import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum TeacherStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  INACTIVE = 'INACTIVE',
}

@Entity('teacher_profiles')
export class TeacherProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  teacherId: string; // e.g. "TCH-2026-0001"

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column({ type: 'varchar', default: 'General' })
  department: string;

  @Column({ type: 'varchar', default: 'Instructor' })
  designation: string;

  @Column({ type: 'varchar', nullable: true })
  specialization: string | null;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  officeLocation: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  hireDate: string;

  @Column({
    type: 'enum',
    enum: TeacherStatus,
    default: TeacherStatus.ACTIVE,
  })
  status: TeacherStatus;

  @OneToMany('CourseOffering', (offering: any) => offering.teacher)
  offerings: Relation<any>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
