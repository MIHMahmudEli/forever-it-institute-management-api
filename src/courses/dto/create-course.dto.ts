import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourseStatus } from '../entities/course.entity.js';

export class CreateCourseDto {
  @ApiProperty({ example: 'BOC-01', description: 'Unique course code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Basic Office Course', description: 'Course title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Basic Office Course', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'Complete computer fundamentals & MS Office', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '3 Months', default: '3 Months' })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 4000.0, description: 'Course total fee in BDT' })
  @IsNumber()
  @Min(0)
  totalFee: number;

  @ApiProperty({ enum: CourseStatus, default: CourseStatus.ACTIVE, required: false })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;
}

export class UpdateCourseDto {
  @ApiProperty({ example: 'BOC-01', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'Basic Office Course', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalFee?: number;

  @ApiProperty({ enum: CourseStatus, required: false })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;
}
