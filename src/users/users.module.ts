import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { StaffController } from './staff.controller.js';
import { AccountController } from './account.controller.js';
import { User } from './entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, StaffController, AccountController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
