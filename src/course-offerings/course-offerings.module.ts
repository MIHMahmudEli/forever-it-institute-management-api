import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseOffering } from './entities/course-offering.entity.js';
import { OfferingSchedule } from './entities/offering-schedule.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AcademicTerm } from '../academic-terms/entities/academic-term.entity.js';
import { TeacherProfile } from '../teachers/entities/teacher.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { ClassSession } from '../class-sessions/entities/class-session.entity.js';
import { CourseOfferingsService } from './course-offerings.service.js';
import { CourseOfferingsController } from './course-offerings.controller.js';
import { TimetableModule } from '../timetable/timetable.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseOffering,
      OfferingSchedule,
      Course,
      AcademicTerm,
      TeacherProfile,
      Enrollment,
      Student,
      ClassSession,
    ]),
    TimetableModule,
    NotificationsModule,
  ],
  controllers: [CourseOfferingsController],
  providers: [CourseOfferingsService],
  exports: [CourseOfferingsService],
})
export class CourseOfferingsModule {}
