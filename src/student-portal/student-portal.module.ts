import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentPortalService } from './student-portal.service.js';
import { StudentPortalController } from './student-portal.controller.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { DropRequest } from '../drop-requests/entities/drop-request.entity.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Enrollment, Payment, DropRequest, User]),
  ],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
  exports: [StudentPortalService],
})
export class StudentPortalModule {}
