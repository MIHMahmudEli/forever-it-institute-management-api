import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CourseOfferingsService } from './course-offerings.service.js';
import {
  CreateCourseOfferingDto,
  UpdateCourseOfferingDto,
} from './dto/course-offering.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Course Offerings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(private readonly offeringsService: CourseOfferingsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new course offering with weekly schedule (Admin only)' })
  @ApiResponse({ status: 201, description: 'Course offering created' })
  async create(@Body() dto: CreateCourseOfferingDto) {
    return this.offeringsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'List course offerings with optional filters' })
  async findAll(
    @Query('termId') termId?: string,
    @Query('courseId') courseId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('status') status?: string,
  ) {
    return this.offeringsService.findAll({ termId, courseId, teacherId, status });
  }

  @Get('available')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get available course offerings for student self-service registration' })
  async getAvailable(
    @CurrentUser('studentId') studentId: string,
    @Query('termId') termId?: string,
  ) {
    return this.offeringsService.getAvailableForStudent(studentId, termId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get single course offering details' })
  async findOne(@Param('id') id: string) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update course offering (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseOfferingDto) {
    return this.offeringsService.update(id, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish offering and auto-generate class sessions (Admin only)' })
  async publish(@Param('id') id: string) {
    return this.offeringsService.publish(id);
  }

  @Post(':id/register')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Student self-service open-credit course registration' })
  async register(
    @Param('id') offeringId: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    return this.offeringsService.registerStudent(studentId, offeringId);
  }
}
