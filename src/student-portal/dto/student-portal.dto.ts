import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDropRequestDto {
  @ApiProperty({ description: 'Enrollment UUID to drop' })
  @IsUUID()
  @IsNotEmpty()
  enrollmentId: string;

  @ApiProperty({ description: 'Reason for requesting course drop', minLength: 5 })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Reason must be at least 5 characters long.' })
  reason: string;
}

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ description: 'Current residential address' })
  @IsOptional()
  @IsString()
  presentAddress?: string;

  @ApiPropertyOptional({ description: 'Parent / Guardian name' })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiPropertyOptional({ description: 'Parent / Guardian mobile contact' })
  @IsOptional()
  @IsString()
  parentMobileNumber?: string;
}

export class RequestCourseEnrollmentDto {
  @ApiProperty({ description: 'Course UUID to request enrollment in' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({ description: 'Optional message or batch preference for administration' })
  @IsOptional()
  @IsString()
  notes?: string;
}
