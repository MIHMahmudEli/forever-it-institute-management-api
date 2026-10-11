import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity.js';
import { Enrollment } from '../../enrollments/entities/enrollment.entity.js';

export enum PaymentMethod {
  CASH = 'CASH',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD',
  ROCKET = 'ROCKET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  COMPLETED = 'COMPLETED',
  REVERSED = 'REVERSED',
  PENDING = 'PENDING',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  receiptNumber: string;

  @Index()
  @Column()
  studentId: string;

  @Index()
  @Column({ nullable: true })
  enrollmentId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  paymentDate: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  transactionReference: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ nullable: true })
  receivedBy: string | null;

  @Column({ type: 'text', nullable: true })
  reversalReason: string | null;

  @Column({ nullable: true })
  reversedBy: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reversedAt: Date | null;

  @ManyToOne(() => Student, (student) => student.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.payments, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
