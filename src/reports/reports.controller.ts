import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('enrollments')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get enrollment report with date range and status filters' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'status', enum: EnrollmentStatus, required: false })
  async getEnrollmentReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.reportsService.getEnrollmentReport(startDate, endDate, courseId, status);
  }

  @Get('payments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payment report with date range, method, and status filters' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'method', enum: PaymentMethod, required: false })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  async getPaymentReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('method') method?: PaymentMethod,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.reportsService.getPaymentReport(startDate, endDate, method, status);
  }

  @Get('dues')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get outstanding dues report across all students' })
  async getDuesReport() {
    return this.reportsService.getDuesReport();
  }
}
