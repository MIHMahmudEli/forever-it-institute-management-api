import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentType } from '../entities/assessment.entity.js';

export class CreateAssessmentDto {
  @IsUUID()
  @IsNotEmpty()
  offeringId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(AssessmentType)
  type: AssessmentType;

  @IsNumber()
  @Min(1)
  totalMarks: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  weightage: number; // percentage

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class StudentGradeItemDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @Min(0)
  obtainedMarks: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class RecordGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentGradeItemDto)
  grades: StudentGradeItemDto[];

  @IsBoolean()
  @IsOptional()
  publish?: boolean;
}
