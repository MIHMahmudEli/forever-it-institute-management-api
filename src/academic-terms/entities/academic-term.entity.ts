import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';

export enum AcademicTermStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('academic_terms')
export class AcademicTerm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  code: string; // e.g. "SP26", "FA26"

  @Column({ type: 'varchar' })
  name: string; // e.g. "Spring 2026", "Fall 2026"

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'date' })
  registrationStartDate: string;

  @Column({ type: 'date' })
  registrationEndDate: string;

  @Column({
    type: 'enum',
    enum: AcademicTermStatus,
    default: AcademicTermStatus.UPCOMING,
  })
  status: AcademicTermStatus;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @OneToMany('CourseOffering', (offering: any) => offering.term)
  offerings: Relation<any>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
