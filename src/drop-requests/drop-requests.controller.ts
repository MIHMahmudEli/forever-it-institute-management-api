import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DropRequestsService } from './drop-requests.service.js';
import { QueryDropRequestDto, ReviewDropRequestDto } from './dto/drop-request.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Drop Requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('drop-requests')
export class DropRequestsController {
  constructor(private readonly dropRequestsService: DropRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of student course drop requests (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'List of drop requests' })
  async findAll(@Query() query: QueryDropRequestDto) {
    return this.dropRequestsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single drop request by ID (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'Drop request details' })
  async findOne(@Param('id') id: string) {
    return this.dropRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a student course drop request (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'Drop request approved and enrollment set to DROPPED' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewDropRequestDto,
    @CurrentUser('id') reviewerId: string,
    @CurrentUser('fullName') reviewerName: string,
  ) {
    return this.dropRequestsService.approve(id, reviewerId, reviewerName, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a student course drop request (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'Drop request rejected and enrollment restored to ACTIVE' })
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewDropRequestDto,
    @CurrentUser('id') reviewerId: string,
    @CurrentUser('fullName') reviewerName: string,
  ) {
    return this.dropRequestsService.reject(id, reviewerId, reviewerName, dto);
  }
}
