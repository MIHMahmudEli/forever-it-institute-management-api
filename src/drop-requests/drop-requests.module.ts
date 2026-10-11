import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DropRequest } from './entities/drop-request.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { DropRequestsService } from './drop-requests.service.js';
import { DropRequestsController } from './drop-requests.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([DropRequest, Enrollment, Student])],
  controllers: [DropRequestsController],
  providers: [DropRequestsService],
  exports: [DropRequestsService],
})
export class DropRequestsModule {}
