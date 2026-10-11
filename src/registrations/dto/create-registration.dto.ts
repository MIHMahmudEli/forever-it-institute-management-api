import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../payments/entities/payment.entity.js';

export class RegistrationCourseItemDto {
  @ApiProperty({ description: 'Course UUID' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ description: 'Custom agreed fee (optional, defaults to standard course fee)', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  agreedFee?: number;

  @ApiProperty({ description: 'Discount for this course', required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;
}

export class CreateRegistrationDto {
  // Student Information (from Form)
  @ApiProperty({ example: 'Md. Mahmudul Hasan', description: 'Student Name' })
  @IsString()
  @IsNotEmpty({ message: 'Student name is required.' })
  fullName: string;

  @ApiProperty({ example: '19982691234567890', description: 'NID / Birth Certificate No.' })
  @IsString()
  @IsNotEmpty({ message: 'NID or Birth Certificate number is required.' })
  nidOrBirthCertificateNumber: string;

  @ApiProperty({ example: 'House 12, Road 4, Sector 7, Uttara, Dhaka', description: 'Present Address' })
  @IsString()
  @IsNotEmpty({ message: 'Present address is required.' })
  presentAddress: string;

  @ApiProperty({ example: '01712345678', description: 'Mobile No.' })
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required.' })
  @Matches(/^(\+?880|0)?1[3-9]\d{8}$/, {
    message: 'Please enter a valid Bangladeshi mobile number (e.g. 01712345678).',
  })
  mobileNumber: string;

  @ApiProperty({ example: 'student@example.com', description: 'Student Email (optional)', required: false })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Md. Rafiqul Islam', description: "Parents' Name" })
  @IsString()
  @IsNotEmpty({ message: "Parents' name is required." })
  parentName: string;

  @ApiProperty({ example: '01812345678', description: "Parents' Mobile No." })
  @IsString()
  @IsNotEmpty({ message: "Parents' mobile number is required." })
  @Matches(/^(\+?880|0)?1[3-9]\d{8}$/, {
    message: "Please enter a valid Bangladeshi parent mobile number.",
  })
  parentMobileNumber: string;

  // Selected Courses (supports multiple courses)
  @ApiProperty({
    type: [RegistrationCourseItemDto],
    description: 'Array of courses selected during registration',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationCourseItemDto)
  courses: RegistrationCourseItemDto[];

  // Initial / Advance Payment Information
  @ApiProperty({ example: 5000.0, description: 'Advance Payment amount in BDT', required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  advancePayment?: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH, required: false })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ example: 'TXN-0987654321', required: false })
  @IsString()
  @IsOptional()
  transactionReference?: string;

  @ApiProperty({ example: '2026-10-11', required: false })
  @IsOptional()
  registrationDate?: string;

  @ApiProperty({ example: 'First installment paid on admission', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
