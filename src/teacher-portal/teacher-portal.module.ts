import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherProfile } from '../teachers/entities/teacher.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CourseOffering } from '../course-offerings/entities/course-offering.entity.js';
import { ClassSession } from '../class-sessions/entities/class-session.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { GradebookModule } from '../gradebook/gradebook.module.js';
import { TeacherPortalService } from './teacher-portal.service.js';
import { TeacherPortalController } from './teacher-portal.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherProfile,
      User,
      CourseOffering,
      ClassSession,
      Enrollment,
    ]),
    AttendanceModule,
    GradebookModule,
  ],
  controllers: [TeacherPortalController],
  providers: [TeacherPortalService],
  exports: [TeacherPortalService],
})
export class TeacherPortalModule {}
