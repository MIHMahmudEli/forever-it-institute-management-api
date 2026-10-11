import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EnrollmentStatus } from '../entities/enrollment.entity.js';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Student UUID' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Course UUID' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ example: 15000.0, description: 'Agreed fee for this course', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  agreedFee?: number;

  @ApiProperty({ example: 1000.0, description: 'Applicable discount', required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ example: '2026-10-11', required: false })
  @IsDateString()
  @IsOptional()
  enrollmentDate?: string;

  @ApiProperty({ enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE, required: false })
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateEnrollmentDto {
  @ApiProperty({ enum: EnrollmentStatus, required: false })
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
