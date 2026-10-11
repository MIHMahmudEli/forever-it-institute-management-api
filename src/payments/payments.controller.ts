import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto, ReversePaymentDto, QueryPaymentDto } from './dto/create-payment.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Record a payment against a student enrollment' })
  @ApiResponse({ status: 201, description: 'Payment recorded and receipt generated' })
  async create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser('fullName') userName: string) {
    return this.paymentsService.create(createPaymentDto, userName);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated payment records with filtering' })
  async findAll(@Query() queryDto: QueryPaymentDto) {
    return this.paymentsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment record by ID' })
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get printable payment receipt details' })
  async getReceipt(@Param('id') id: string) {
    return this.paymentsService.getReceipt(id);
  }

  @Post(':id/reverse')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reverse a payment with audit reason (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment reversed' })
  async reverse(
    @Param('id') id: string,
    @Body() reversePaymentDto: ReversePaymentDto,
    @CurrentUser('email') userEmail: string,
  ) {
    return this.paymentsService.reverse(id, reversePaymentDto, userEmail);
  }
}
