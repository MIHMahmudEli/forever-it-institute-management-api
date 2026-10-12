import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service.js';
import { CreateStudentDto, UpdateStudentDto, QueryStudentDto } from './dto/create-student.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Students')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new student record' })
  @ApiResponse({ status: 201, description: 'Student registered successfully' })
  async create(@Body() createStudentDto: CreateStudentDto, @CurrentUser('id') userId: string) {
    return this.studentsService.create(createStudentDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of students with search & status filters' })
  async findAll(@Query() queryDto: QueryStudentDto) {
    return this.studentsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student details, enrollments, and payment history' })
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post(':id/provision-account')
  @ApiOperation({ summary: 'Provision a login account for an existing student without one' })
  @ApiResponse({ status: 201, description: 'Student portal credentials generated' })
  async provisionAccount(
    @Param('id') id: string,
    @Body('email') email?: string,
  ) {
    return this.studentsService.provisionAccount(id, email);
  }

  @Post(':id/regenerate-credentials')
  @ApiOperation({ summary: 'Regenerate login credentials for an existing student' })
  @ApiResponse({ status: 200, description: 'Student portal credentials regenerated' })
  async regenerateCredentials(@Param('id') id: string) {
    return this.studentsService.regenerateCredentials(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update student details' })
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.studentsService.update(id, updateStudentDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Archive a student (Admin only)' })
  async archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.studentsService.archive(id, userId);
  }
}
