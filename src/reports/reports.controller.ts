import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { EnrollmentStatus } from '../enrollments/entities/enrollment.entity.js';
import { PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('enrollments')
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
  @ApiOperation({ summary: 'Get outstanding dues report across all students' })
  async getDuesReport() {
    return this.reportsService.getDuesReport();
  }
}
