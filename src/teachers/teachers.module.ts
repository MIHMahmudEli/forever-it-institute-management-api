import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherProfile } from './entities/teacher.entity.js';
import { User } from '../users/entities/user.entity.js';
import { TeachersService } from './teachers.service.js';
import { TeachersController } from './teachers.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherProfile, User])],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
