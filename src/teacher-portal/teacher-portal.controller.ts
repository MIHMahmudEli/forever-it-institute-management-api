import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherPortalService } from './teacher-portal.service.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { CreateAssessmentDto, RecordGradesDto } from '../gradebook/dto/gradebook.dto.js';
import { BulkMarkAttendanceDto } from '../attendance/dto/attendance.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  MustChangePasswordGuard,
  AllowMustChangePassword,
} from '../common/guards/must-change-password.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Teacher Portal')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles(UserRole.TEACHER)
@Controller('teacher-portal')
export class TeacherPortalController {
  constructor(private readonly teacherPortalService: TeacherPortalService) {}

  @Get('me')
  @AllowMustChangePassword()
  @ApiOperation({ summary: 'Get teacher profile and status' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.teacherPortalService.getMe(userId);
  }

  @Post('change-password')
  @AllowMustChangePassword()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher password change (mandatory on first login)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.teacherPortalService.changePassword(userId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Teacher dashboard overview and metrics' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.teacherPortalService.getDashboard(userId);
  }

  @Get('timetable')
  @ApiOperation({ summary: 'Teacher weekly teaching schedule/routine' })
  async getTimetable(@CurrentUser('id') userId: string) {
    return this.teacherPortalService.getTimetable(userId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'List assigned course offerings' })
  async getCourses(@CurrentUser('id') userId: string) {
    return this.teacherPortalService.getCourses(userId);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get assigned course offering details' })
  async getCourse(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.teacherPortalService.getCourse(userId, id);
  }

  @Get('courses/:id/roster')
  @ApiOperation({ summary: 'Get student roster with attendance and performance for assigned offering' })
  async getCourseRoster(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.teacherPortalService.getCourseRoster(userId, id);
  }

  @Get('courses/:id/sessions')
  @ApiOperation({ summary: 'Get class sessions for assigned offering' })
  async getCourseSessions(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.teacherPortalService.getCourseSessions(userId, id);
  }

  @Post('sessions/:sessionId/attendance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark class session attendance' })
  async markAttendance(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkMarkAttendanceDto,
  ) {
    return this.teacherPortalService.markSessionAttendance(userId, sessionId, dto);
  }

  @Get('courses/:id/gradebook')
  @ApiOperation({ summary: 'Get gradebook matrix for assigned offering' })
  async getGradebook(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.teacherPortalService.getCourseGradebook(userId, id);
  }

  @Post('assessments')
  @ApiOperation({ summary: 'Create assessment component for assigned offering' })
  async createAssessment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.teacherPortalService.createAssessment(userId, dto);
  }

  @Post('assessments/:assessmentId/grades')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save/Publish student grades for assessment' })
  async recordGrades(
    @CurrentUser('id') userId: string,
    @Param('assessmentId') assessmentId: string,
    @Body() dto: RecordGradesDto,
  ) {
    return this.teacherPortalService.recordGrades(userId, assessmentId, dto);
  }
}
