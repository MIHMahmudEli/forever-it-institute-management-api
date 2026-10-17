import { IsString, IsNotEmpty, IsDateString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { AcademicTermStatus } from '../entities/academic-term.entity.js';

export class CreateAcademicTermDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsDateString()
  registrationStartDate: string;

  @IsDateString()
  registrationEndDate: string;

  @IsEnum(AcademicTermStatus)
  @IsOptional()
  status?: AcademicTermStatus;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class UpdateAcademicTermDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsDateString()
  @IsOptional()
  registrationStartDate?: string;

  @IsDateString()
  @IsOptional()
  registrationEndDate?: string;

  @IsEnum(AcademicTermStatus)
  @IsOptional()
  status?: AcademicTermStatus;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
