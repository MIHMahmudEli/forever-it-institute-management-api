import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { StudentStatus } from '../entities/student.entity.js';

export class CreateStudentDto {
  @ApiProperty({ example: 'Md. Mahmudul Hasan', description: 'Full name of the student' })
  @IsString()
  @IsNotEmpty({ message: 'Student full name is required.' })
  fullName: string;

  @ApiProperty({ example: '19982691234567890', description: 'NID or Birth Certificate Number' })
  @IsString()
  @IsNotEmpty({ message: 'NID or Birth Certificate number is required.' })
  nidOrBirthCertificateNumber: string;

  @ApiProperty({ example: 'House 12, Road 4, Sector 7, Uttara, Dhaka', description: 'Present address' })
  @IsString()
  @IsNotEmpty({ message: 'Present address is required.' })
  presentAddress: string;

  @ApiProperty({ example: '01712345678', description: 'Student mobile phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required.' })
  @Matches(/^(\+?880|0)?1[3-9]\d{8}$/, {
    message: 'Please provide a valid Bangladeshi mobile number (e.g. 01712345678).',
  })
  mobileNumber: string;

  @ApiProperty({ example: 'Md. Rafiqul Islam', description: "Parent or guardian's name" })
  @IsString()
  @IsNotEmpty({ message: "Parent's name is required." })
  parentName: string;

  @ApiProperty({ example: '01812345678', description: "Parent's contact number" })
  @IsString()
  @IsNotEmpty({ message: "Parent's mobile number is required." })
  @Matches(/^(\+?880|0)?1[3-9]\d{8}$/, {
    message: "Please provide a valid Bangladeshi parent mobile number (e.g. 01812345678).",
  })
  parentMobileNumber: string;

  @ApiProperty({ enum: StudentStatus, default: StudentStatus.ACTIVE, required: false })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}

export class UpdateStudentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nidOrBirthCertificateNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  presentAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(/^(\+?880|0)?1[3-9]\d{8}$/, {
    message: 'Please provide a valid Bangladeshi mobile number.',
  })
  mobileNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(/^(\+?880|0)?1[3-9]\d{8}$/, {
    message: "Please provide a valid Bangladeshi parent mobile number.",
  })
  parentMobileNumber?: string;

  @ApiProperty({ enum: StudentStatus, required: false })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  isArchived?: boolean;
}

export class QueryStudentDto {
  @ApiProperty({ required: false, description: 'Search across name, registration number, mobile, NID' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: StudentStatus, required: false })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  limit?: number;
}
