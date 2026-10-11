import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get live KPI metrics, charts, and activity feeds' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics successfully returned' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }
}
