import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateParentDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  relationship?: string; // Father, Mother, Guardian

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  studentIds?: string[];
}

export class LinkStudentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsBoolean()
  @IsOptional()
  isPrimaryGuardian?: boolean;
}
