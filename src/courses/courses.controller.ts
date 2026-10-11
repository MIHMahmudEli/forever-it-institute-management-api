import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto.js';
import { CourseStatus } from './entities/course.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Courses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with optional status filter (All authenticated)' })
  @ApiQuery({ name: 'status', enum: CourseStatus, required: false })
  async findAll(@Query('status') status?: CourseStatus) {
    return this.coursesService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course details by ID' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update course details (Admin only)' })
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Archive a course (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
