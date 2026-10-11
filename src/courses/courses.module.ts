import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service.js';
import { CoursesController } from './courses.controller.js';
import { Course } from './entities/course.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
