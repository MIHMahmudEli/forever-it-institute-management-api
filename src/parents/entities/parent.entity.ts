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
import type { ParentStudentRelationship } from './parent-student-relationship.entity.js';

@Entity('parent_profiles')
export class ParentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar', default: 'Guardian' })
  relationship: string; // e.g. "Father", "Mother", "Guardian"

  @Column({ type: 'varchar', nullable: true })
  occupation: string | null;

  @Column({ type: 'varchar', nullable: true })
  emergencyContact: string | null;

  @OneToMany('ParentStudentRelationship', (rel: ParentStudentRelationship) => rel.parent)
  studentRelationships: Relation<ParentStudentRelationship>[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
