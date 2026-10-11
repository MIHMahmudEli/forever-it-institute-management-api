import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentPortalService } from './student-portal.service.js';
import { CreateStudentDropRequestDto, UpdateStudentProfileDto } from './dto/student-portal.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  MustChangePasswordGuard,
  AllowMustChangePassword,
} from '../common/guards/must-change-password.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Student Portal')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles(UserRole.STUDENT)
@Controller('student-portal')
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('me')
  @AllowMustChangePassword()
  @ApiOperation({ summary: 'Get authenticated student profile and account status' })
  @ApiResponse({ status: 200, description: 'Student profile returned' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getMe(userId);
  }

  @Post('change-password')
  @AllowMustChangePassword()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change student password (required on first login)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.studentPortalService.changePassword(userId, dto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update student contact details' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentPortalService.updateProfile(userId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard statistics and recent records' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics returned' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getDashboard(userId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'List all enrolled courses for the logged-in student' })
  @ApiResponse({ status: 200, description: 'List of student enrollments' })
  async getCourses(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getCourses(userId);
  }

  @Get('courses/:enrollmentId')
  @ApiOperation({ summary: 'Get course enrollment details, payment balance, and history' })
  @ApiResponse({ status: 200, description: 'Course enrollment details' })
  async getCourse(
    @CurrentUser('id') userId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.studentPortalService.getCourse(userId, enrollmentId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payment history and receipts for the logged-in student' })
  @ApiResponse({ status: 200, description: 'List of student payments' })
  async getPayments(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getPayments(userId);
  }

  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Get single receipt details for viewing or printing' })
  @ApiResponse({ status: 200, description: 'Payment receipt details' })
  async getPayment(
    @CurrentUser('id') userId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.studentPortalService.getPayment(userId, paymentId);
  }

  @Get('drop-requests')
  @ApiOperation({ summary: 'List course drop requests submitted by the student' })
  @ApiResponse({ status: 200, description: 'List of drop requests' })
  async getDropRequests(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getDropRequests(userId);
  }

  @Post('drop-requests')
  @ApiOperation({ summary: 'Submit a new course drop request' })
  @ApiResponse({ status: 201, description: 'Drop request submitted for review' })
  async createDropRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStudentDropRequestDto,
  ) {
    return this.studentPortalService.createDropRequest(userId, dto);
  }

  @Delete('drop-requests/:id')
  @ApiOperation({ summary: 'Cancel a pending course drop request' })
  @ApiResponse({ status: 200, description: 'Drop request cancelled' })
  async cancelDropRequest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.studentPortalService.cancelDropRequest(userId, id);
  }
}
