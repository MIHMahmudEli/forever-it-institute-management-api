import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity.js';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Student UUID' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Enrollment UUID (optional if unallocated advance)', required: false })
  @IsUUID()
  @IsOptional()
  enrollmentId?: string;

  @ApiProperty({ example: 5000.0, description: 'Amount paid in BDT' })
  @IsNumber()
  @Min(1, { message: 'Payment amount must be greater than 0.' })
  amount: number;

  @ApiProperty({ example: '2026-10-11', required: false })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'TXN-987654321', required: false })
  @IsString()
  @IsOptional()
  transactionReference?: string;

  @ApiProperty({ example: 'Advance payment for Basic Office Course', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReversePaymentDto {
  @ApiProperty({ example: 'Accidental duplicate entry entered by staff', description: 'Mandatory reason for reversal' })
  @IsString()
  @IsNotEmpty({ message: 'A reason for reversing the payment must be provided.' })
  reversalReason: string;
}

export class QueryPaymentDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  enrollmentId?: string;

  @ApiProperty({ enum: PaymentStatus, required: false })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod, required: false })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  limit?: number;
}
