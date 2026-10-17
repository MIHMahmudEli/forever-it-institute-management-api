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
import { ParentProfile } from './parent.entity.js';
import { Student } from '../../students/entities/student.entity.js';

@Entity('parent_student_relationships')
@Unique(['parentId', 'studentId'])
export class ParentStudentRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  parentId: string;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'boolean', default: true })
  isPrimaryGuardian: boolean;

  @Column({ type: 'boolean', default: true })
  isVerified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

  @ManyToOne(() => ParentProfile, (parent) => parent.studentRelationships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Relation<ParentProfile>;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Relation<Student>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
