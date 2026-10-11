import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationsService } from './registrations.service.js';
import { RegistrationsController } from './registrations.controller.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Course, Enrollment, Payment, AuditLog])],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
