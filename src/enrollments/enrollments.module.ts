import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsService } from './enrollments.service.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../courses/entities/course.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Student, Course])],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
