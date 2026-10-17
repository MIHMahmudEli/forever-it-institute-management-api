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
import { AcademicTermsService } from './academic-terms.service.js';
import { CreateAcademicTermDto, UpdateAcademicTermDto } from './dto/academic-term.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Academic Terms')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-terms')
export class AcademicTermsController {
  constructor(private readonly termsService: AcademicTermsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new academic term (Admin only)' })
  @ApiResponse({ status: 201, description: 'Academic term created' })
  async create(@Body() dto: CreateAcademicTermDto) {
    return this.termsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'List all academic terms' })
  async findAll() {
    return this.termsService.findAll();
  }

  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get current/active academic term' })
  async findCurrent() {
    return this.termsService.findCurrent();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get single academic term details' })
  async findOne(@Param('id') id: string) {
    return this.termsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update academic term (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateAcademicTermDto) {
    return this.termsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete academic term (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.termsService.remove(id);
  }
}
