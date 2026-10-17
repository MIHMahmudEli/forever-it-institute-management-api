import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service.js';
import { BulkMarkAttendanceDto } from './dto/attendance.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('session/:sessionId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get class session student roster and marked attendance' })
  async getSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendance(sessionId);
  }

  @Post('session/:sessionId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk mark/update attendance for a class session' })
  async bulkMarkAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkMarkAttendanceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.bulkMarkAttendance(sessionId, dto, userId);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get comprehensive student attendance percentage and history' })
  async getStudentReport(
    @Param('studentId') studentId: string,
    @Query('offeringId') offeringId?: string,
  ) {
    return this.attendanceService.getStudentAttendanceReport(studentId, offeringId);
  }
}
