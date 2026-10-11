import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Registrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Execute complete transactional student registration workflow' })
  @ApiResponse({ status: 201, description: 'Student registered, courses enrolled, and receipt issued' })
  async register(@Body() createRegistrationDto: CreateRegistrationDto, @CurrentUser() user: any) {
    return this.registrationsService.register(createRegistrationDto, {
      id: user?.id,
      name: user?.fullName,
      email: user?.email,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get printable registration document data by Student ID or Registration Number' })
  async getRegistrationDocument(@Param('id') id: string) {
    return this.registrationsService.getRegistrationDocument(id);
  }
}
