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
import { GradebookService } from './gradebook.service.js';
import { CreateAssessmentDto, RecordGradesDto } from './dto/gradebook.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Gradebook')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Post('assessments')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create assessment component for course offering' })
  async createAssessment(@Body() dto: CreateAssessmentDto) {
    return this.gradebookService.createAssessment(dto);
  }

  @Get('offerings/:offeringId/assessments')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List all assessments for a course offering' })
  async getOfferingAssessments(@Param('offeringId') offeringId: string) {
    return this.gradebookService.getOfferingAssessments(offeringId);
  }

  @Get('offerings/:offeringId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get complete gradebook matrix for an offering' })
  async getOfferingGradebook(@Param('offeringId') offeringId: string) {
    return this.gradebookService.getOfferingGradebook(offeringId);
  }

  @Post('assessments/:assessmentId/grades')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enter/update student grades for an assessment' })
  async recordGrades(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: RecordGradesDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.gradebookService.recordGrades(assessmentId, dto, userId);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get student academic grades (published only for student/parent)' })
  async getStudentGrades(
    @Param('studentId') studentId: string,
    @Query('offeringId') offeringId?: string,
  ) {
    return this.gradebookService.getStudentGrades(studentId, offeringId);
  }
}
