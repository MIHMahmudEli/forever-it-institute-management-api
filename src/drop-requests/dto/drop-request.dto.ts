import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DropRequestStatus } from '../entities/drop-request.entity.js';

export class ReviewDropRequestDto {
  @ApiPropertyOptional({ description: 'Administrative or internal notes regarding review decision' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class QueryDropRequestDto {
  @ApiPropertyOptional({ description: 'Search term for student name, registration number, or course name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DropRequestStatus, description: 'Filter by drop request status' })
  @IsOptional()
  @IsEnum(DropRequestStatus)
  status?: DropRequestStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
