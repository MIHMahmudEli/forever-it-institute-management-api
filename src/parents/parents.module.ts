import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentProfile } from './entities/parent.entity.js';
import { ParentStudentRelationship } from './entities/parent-student-relationship.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { ParentsService } from './parents.service.js';
import { ParentsController } from './parents.controller.js';
import { ParentPortalController } from './parent-portal.controller.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { GradebookModule } from '../gradebook/gradebook.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParentProfile,
      ParentStudentRelationship,
      User,
      Student,
      Enrollment,
      Payment,
    ]),
    AttendanceModule,
    GradebookModule,
  ],
  controllers: [ParentsController, ParentPortalController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
