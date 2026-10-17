import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from './entities/assessment.entity.js';
import { Grade } from './entities/grade.entity.js';
import { CourseOffering } from '../course-offerings/entities/course-offering.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { GradebookService } from './gradebook.service.js';
import { GradebookController } from './gradebook.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assessment, Grade, CourseOffering, Enrollment, Student]),
    NotificationsModule,
  ],
  controllers: [GradebookController],
  providers: [GradebookService],
  exports: [GradebookService],
})
export class GradebookModule {}
