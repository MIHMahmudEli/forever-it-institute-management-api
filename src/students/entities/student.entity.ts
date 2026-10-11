import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import { Payment } from '../../payments/entities/payment.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  registrationNumber: string;

  @Index()
  @Column({ type: 'varchar' })
  fullName: string;

  @Index()
  @Column({ type: 'varchar' })
  nidOrBirthCertificateNumber: string;

  @Column({ type: 'text' })
  presentAddress: string;

  @Index()
  @Column({ type: 'varchar' })
  mobileNumber: string;

  @Column({ type: 'varchar' })
  parentName: string;

  @Column({ type: 'varchar' })
  parentMobileNumber: string;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE,
  })
  status: StudentStatus;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', nullable: true, unique: true })
  userId?: string | null;

  @OneToOne(() => User, (user) => user.student, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: Relation<User> | null;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Relation<Enrollment>[];

  @OneToMany(() => Payment, (payment) => payment.student)
  payments: Relation<Payment>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
