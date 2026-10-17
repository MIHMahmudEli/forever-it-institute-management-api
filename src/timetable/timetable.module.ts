import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseOffering } from '../course-offerings/entities/course-offering.entity.js';
import { OfferingSchedule } from '../course-offerings/entities/offering-schedule.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { TimetableConflictService } from './timetable-conflict.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CourseOffering, OfferingSchedule, Enrollment])],
  providers: [TimetableConflictService],
  exports: [TimetableConflictService],
})
export class TimetableModule {}
