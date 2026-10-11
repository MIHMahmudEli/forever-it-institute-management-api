import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateStaffDto, UpdateStaffDto, UpdateStaffStatusDto } from './dto/create-staff.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from './entities/user.entity.js';

@ApiTags('Staff Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('staff')
export class StaffController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff member account (Admin only)' })
  @ApiResponse({ status: 201, description: 'Staff account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() dto: CreateStaffDto,
    @CurrentUser('id') adminId: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.usersService.createStaff(dto, adminId, ip);
  }

  @Get()
  @ApiOperation({ summary: 'List staff accounts with search and filtering (Admin only)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by full name or email' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ALL'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAllStaff({
      search,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff account details by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Staff account details returned' })
  @ApiResponse({ status: 404, description: 'Staff account not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findStaffById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member profile or reset password (Admin only)' })
  @ApiResponse({ status: 200, description: 'Staff account updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser('id') adminId: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.usersService.updateStaff(id, dto, adminId, ip);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a staff member account (Admin only)' })
  @ApiResponse({ status: 200, description: 'Account status updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate self or last administrator' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
    @CurrentUser('id') adminId: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.usersService.updateStaffStatus(id, dto.isActive, adminId, ip);
  }
}
