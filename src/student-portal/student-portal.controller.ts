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
import {
  CreateStudentDropRequestDto,
  UpdateStudentProfileDto,
  RequestCourseEnrollmentDto,
} from './dto/student-portal.dto.js';
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

  @Get('available-courses')
  @ApiOperation({ summary: 'List all available institute courses with enrollment status' })
  @ApiResponse({ status: 200, description: 'List of available courses' })
  async getAvailableCourses(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getAvailableCourses(userId);
  }

  @Post('request-enrollment')
  @ApiOperation({ summary: 'Request enrollment into an available course' })
  @ApiResponse({ status: 201, description: 'Enrollment request submitted with PENDING status' })
  async requestEnrollment(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestCourseEnrollmentDto,
  ) {
    return this.studentPortalService.requestEnrollment(userId, dto);
  }

  @Delete('enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Cancel a pending course enrollment request' })
  @ApiResponse({ status: 200, description: 'Pending enrollment request cancelled' })
  async cancelEnrollmentRequest(
    @CurrentUser('id') userId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.studentPortalService.cancelEnrollmentRequest(userId, enrollmentId);
  }

  @Get('routine')
  @ApiOperation({ summary: 'Get rolling 7-day visual routine (Today + next 6 days) in Asia/Dhaka timezone' })
  async getRoutine(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getRollingRoutine(userId);
  }

  @Get('grades')
  @ApiOperation({ summary: 'Get published academic grades and assessments' })
  async getGrades(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getGrades(userId);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get student attendance percentage and session-by-session records' })
  async getAttendance(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getAttendance(userId);
  }

  @Get('offerings')
  @ApiOperation({ summary: 'Browse available course offerings for open-credit registration' })
  async getAvailableOfferings(@CurrentUser('id') userId: string) {
    return this.studentPortalService.getAvailableOfferings(userId);
  }

  @Post('offerings/:offeringId/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Open-credit self-service course offering registration' })
  async registerOffering(
    @CurrentUser('id') userId: string,
    @Param('offeringId') offeringId: string,
  ) {
    return this.studentPortalService.registerOffering(userId, offeringId);
  }
}
