import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseOffering, CourseOfferingStatus } from '../course-offerings/entities/course-offering.entity.js';
import { OfferingSchedule } from '../course-offerings/entities/offering-schedule.entity.js';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';

export interface ScheduleSlot {
  dayOfWeek: number;
  dayName: string;
  startTime: string; // "HH:mm" or "HH:mm:ss"
  endTime: string;   // "HH:mm" or "HH:mm:ss"
  classroom?: string | null;
}

export interface ConflictDetail {
  type: 'STUDENT_SCHEDULE' | 'TEACHER_SCHEDULE' | 'CLASSROOM_DOUBLE_BOOKING';
  reason: string;
  conflictingOfferingId: string;
  conflictingOfferingCode: string;
  conflictingCourseName: string;
  dayOfWeek: number;
  dayName: string;
  timeRange: string;
  classroom?: string | null;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
}

/**
 * Normalizes time string into minutes since midnight (0..1439).
 * Accepts "HH:mm" or "HH:mm:ss".
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Tests whether two time intervals on the same day overlap.
 * Uses strict inequality: startA < endB AND startB < endA
 * Back-to-back classes (e.g. 10:00-11:30 and 11:30-13:00) do NOT overlap.
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const sA = timeStringToMinutes(startA);
  const eA = timeStringToMinutes(endA);
  const sB = timeStringToMinutes(startB);
  const eB = timeStringToMinutes(endB);

  return sA < eB && sB < eA;
}

@Injectable()
export class TimetableConflictService {
  constructor(
    @InjectRepository(CourseOffering)
    private readonly offeringRepo: Repository<CourseOffering>,
    @InjectRepository(OfferingSchedule)
    private readonly scheduleRepo: Repository<OfferingSchedule>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  /**
   * Check for schedule clash for a student attempting to register for a course offering.
   */
  async checkStudentConflict(
    studentId: string,
    targetOfferingId: string,
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetail[] = [];

    // Load target offering and its schedules
    const targetOffering = await this.offeringRepo.findOne({
      where: { id: targetOfferingId },
      relations: { schedules: true, course: true },
    });

    if (!targetOffering || !targetOffering.schedules || targetOffering.schedules.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    // Load all active enrollments for this student with their offerings and schedules
    const activeEnrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      relations: {
        offering: {
          schedules: true,
          course: true,
        },
      },
    });

    for (const enrollment of activeEnrollments) {
      if (!enrollment.offering || enrollment.offering.id === targetOfferingId) {
        continue;
      }

      const existingOffering = enrollment.offering;
      if (
        existingOffering.status === CourseOfferingStatus.CANCELLED ||
        existingOffering.status === CourseOfferingStatus.COMPLETED
      ) {
        continue;
      }

      // Check each schedule pair
      for (const targetSlot of targetOffering.schedules) {
        for (const existingSlot of existingOffering.schedules) {
          if (targetSlot.dayOfWeek === existingSlot.dayOfWeek) {
            if (
              doIntervalsOverlap(
                targetSlot.startTime,
                targetSlot.endTime,
                existingSlot.startTime,
                existingSlot.endTime,
              )
            ) {
              conflicts.push({
                type: 'STUDENT_SCHEDULE',
                reason: `Clashes with ${existingOffering.course?.name || existingOffering.code} on ${targetSlot.dayName} (${existingSlot.startTime.substring(0, 5)} - ${existingSlot.endTime.substring(0, 5)})`,
                conflictingOfferingId: existingOffering.id,
                conflictingOfferingCode: existingOffering.code,
                conflictingCourseName: existingOffering.course?.name || 'Course',
                dayOfWeek: targetSlot.dayOfWeek,
                dayName: targetSlot.dayName,
                timeRange: `${existingSlot.startTime.substring(0, 5)} - ${existingSlot.endTime.substring(0, 5)}`,
                classroom: existingSlot.classroom || existingOffering.classroom,
              });
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Check for schedule conflicts for a teacher across offerings.
   */
  async checkTeacherConflict(
    teacherId: string,
    proposedSchedules: ScheduleSlot[],
    excludeOfferingId?: string,
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetail[] = [];

    const teacherOfferings = await this.offeringRepo.find({
      where: {
        teacherId,
      },
      relations: { schedules: true, course: true },
    });

    for (const offering of teacherOfferings) {
      if (excludeOfferingId && offering.id === excludeOfferingId) continue;
      if (
        offering.status === CourseOfferingStatus.CANCELLED ||
        offering.status === CourseOfferingStatus.COMPLETED
      ) {
        continue;
      }

      for (const proposed of proposedSchedules) {
        for (const existing of offering.schedules) {
          if (proposed.dayOfWeek === existing.dayOfWeek) {
            if (
              doIntervalsOverlap(
                proposed.startTime,
                proposed.endTime,
                existing.startTime,
                existing.endTime,
              )
            ) {
              conflicts.push({
                type: 'TEACHER_SCHEDULE',
                reason: `Teacher is already scheduled for ${offering.course?.name || offering.code} on ${proposed.dayName} (${existing.startTime.substring(0, 5)} - ${existing.endTime.substring(0, 5)})`,
                conflictingOfferingId: offering.id,
                conflictingOfferingCode: offering.code,
                conflictingCourseName: offering.course?.name || 'Course',
                dayOfWeek: proposed.dayOfWeek,
                dayName: proposed.dayName,
                timeRange: `${existing.startTime.substring(0, 5)} - ${existing.endTime.substring(0, 5)}`,
                classroom: existing.classroom || offering.classroom,
              });
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Check for classroom double-booking conflicts across offerings.
   */
  async checkClassroomConflict(
    classroom: string,
    proposedSchedules: ScheduleSlot[],
    excludeOfferingId?: string,
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetail[] = [];
    if (!classroom || !classroom.trim()) {
      return { hasConflict: false, conflicts: [] };
    }

    const normRoom = classroom.trim().toLowerCase();

    // Find all active schedules with this room or belonging to offerings with this room
    const allOfferings = await this.offeringRepo.find({
      relations: { schedules: true, course: true },
    });

    for (const offering of allOfferings) {
      if (excludeOfferingId && offering.id === excludeOfferingId) continue;
      if (
        offering.status === CourseOfferingStatus.CANCELLED ||
        offering.status === CourseOfferingStatus.COMPLETED
      ) {
        continue;
      }

      for (const proposed of proposedSchedules) {
        const proposedRoom = (proposed.classroom || classroom).trim().toLowerCase();

        for (const existing of offering.schedules) {
          const existingRoom = (existing.classroom || offering.classroom || '').trim().toLowerCase();

          if (proposedRoom === existingRoom && proposed.dayOfWeek === existing.dayOfWeek) {
            if (
              doIntervalsOverlap(
                proposed.startTime,
                proposed.endTime,
                existing.startTime,
                existing.endTime,
              )
            ) {
              conflicts.push({
                type: 'CLASSROOM_DOUBLE_BOOKING',
                reason: `Classroom "${classroom}" is booked for ${offering.course?.name || offering.code} on ${proposed.dayName} (${existing.startTime.substring(0, 5)} - ${existing.endTime.substring(0, 5)})`,
                conflictingOfferingId: offering.id,
                conflictingOfferingCode: offering.code,
                conflictingCourseName: offering.course?.name || 'Course',
                dayOfWeek: proposed.dayOfWeek,
                dayName: proposed.dayName,
                timeRange: `${existing.startTime.substring(0, 5)} - ${existing.endTime.substring(0, 5)}`,
                classroom,
              });
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}
