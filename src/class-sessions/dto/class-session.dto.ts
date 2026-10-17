import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateClassSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  sessionDate: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  classroom?: string;

  @IsString()
  @IsOptional()
  topic?: string;
}
