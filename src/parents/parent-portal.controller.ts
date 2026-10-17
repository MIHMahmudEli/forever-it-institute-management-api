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
import { ParentsService } from './parents.service.js';
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

@ApiTags('Parent Portal')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles(UserRole.PARENT)
@Controller('parent-portal')
export class ParentPortalController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('me')
  @AllowMustChangePassword()
  @ApiOperation({ summary: 'Get parent profile and status' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.parentsService.getMe(userId);
  }

  @Post('change-password')
  @AllowMustChangePassword()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parent password change (mandatory on first login)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.parentsService.changePassword(userId, dto);
  }

  @Get('children')
  @ApiOperation({ summary: 'Get all linked verified children/students' })
  async getChildren(@CurrentUser('id') userId: string) {
    return this.parentsService.getChildren(userId);
  }

  @Get('children/:studentId/dashboard')
  @ApiOperation({ summary: 'Get overview dashboard for a specific linked child' })
  async getChildDashboard(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.parentsService.getChildDashboard(userId, studentId);
  }

  @Get('children/:studentId/timetable')
  @ApiOperation({ summary: 'Get weekly timetable/routine for a specific linked child' })
  async getChildTimetable(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.parentsService.getChildTimetable(userId, studentId);
  }

  @Get('children/:studentId/attendance')
  @ApiOperation({ summary: 'Get attendance report for a specific linked child' })
  async getChildAttendance(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.parentsService.getChildAttendance(userId, studentId);
  }

  @Get('children/:studentId/grades')
  @ApiOperation({ summary: 'Get published academic grades for a specific linked child' })
  async getChildGrades(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.parentsService.getChildGrades(userId, studentId);
  }

  @Get('children/:studentId/payments')
  @ApiOperation({ summary: 'Get payment receipts and ledger for a specific linked child' })
  async getChildPayments(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.parentsService.getChildPayments(userId, studentId);
  }
}
