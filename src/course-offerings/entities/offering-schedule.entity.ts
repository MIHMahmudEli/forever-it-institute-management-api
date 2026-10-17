import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import type { CourseOffering } from './course-offering.entity.js';

@Entity('offering_schedules')
export class OfferingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  offeringId: string;

  @ManyToOne('CourseOffering', (offering: CourseOffering) => offering.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offeringId' })
  offering: Relation<CourseOffering>;

  /**
   * Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JavaScript Date.getDay() convention)
   */
  @Index()
  @Column({ type: 'smallint' })
  dayOfWeek: number;

  @Column({ type: 'varchar', default: 'SUNDAY' })
  dayName: string; // SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY

  /**
   * Time format: 'HH:mm:ss' or 'HH:mm' (24-hour Asia/Dhaka)
   */
  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'varchar', nullable: true })
  classroom: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
