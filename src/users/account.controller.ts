import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { ChangePasswordDto, UpdateAccountDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Account Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getAccountProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile information (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.usersService.updateAccountProfile(userId, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password with current password verification (Admin & Staff)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or password mismatch' })
  @ApiResponse({ status: 401, description: 'Incorrect current password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.usersService.changePassword(userId, dto, ip);
  }
}
