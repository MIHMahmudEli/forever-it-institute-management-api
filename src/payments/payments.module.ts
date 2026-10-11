import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { Payment } from './entities/payment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Student, Enrollment])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
