import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be valid HH:mm or HH:mm:ss format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be valid HH:mm or HH:mm:ss format',
  })
  endTime: string;

  @IsString()
  @IsOptional()
  classroom?: string;
}

export class CreateCourseOfferingDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  termId: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsNotEmpty()
  section: string; // e.g. "Section A", "Batch 10"

  @IsString()
  @IsOptional()
  classroom?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @IsOptional()
  feeOverride?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}

export class UpdateCourseOfferingDto {
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  classroom?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  feeOverride?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  @IsOptional()
  schedules?: ScheduleItemDto[];
}

export class StudentRegisterOfferingDto {
  @IsUUID()
  @IsNotEmpty()
  offeringId: string;
}
