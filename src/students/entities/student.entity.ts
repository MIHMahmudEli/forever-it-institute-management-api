import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import { Payment } from '../../payments/entities/payment.entity.js';

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
  @Column({ unique: true })
  registrationNumber: string;

  @Index()
  @Column()
  fullName: string;

  @Index()
  @Column()
  nidOrBirthCertificateNumber: string;

  @Column({ type: 'text' })
  presentAddress: string;

  @Index()
  @Column()
  mobileNumber: string;

  @Column()
  parentName: string;

  @Column()
  parentMobileNumber: string;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE,
  })
  status: StudentStatus;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @OneToMany(() => Payment, (payment) => payment.student)
  payments: Payment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
