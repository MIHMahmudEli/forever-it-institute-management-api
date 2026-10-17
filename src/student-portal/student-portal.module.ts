import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentPortalService } from './student-portal.service.js';
import { StudentPortalController } from './student-portal.controller.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { DropRequest } from '../drop-requests/entities/drop-request.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { ClassSession } from '../class-sessions/entities/class-session.entity.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { GradebookModule } from '../gradebook/gradebook.module.js';
import { CourseOfferingsModule } from '../course-offerings/course-offerings.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Enrollment,
      Payment,
      DropRequest,
      User,
      Course,
      ClassSession,
    ]),
    AttendanceModule,
    GradebookModule,
    CourseOfferingsModule,
  ],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
  exports: [StudentPortalService],
})
export class StudentPortalModule {}
