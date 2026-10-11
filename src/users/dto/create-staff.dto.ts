import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches, IsBoolean } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'staff.tanvir@foreveritbd.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @ApiProperty({ example: 'StaffPass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number.',
  })
  password: string;

  @ApiProperty({ example: 'Tanvir Ahmed' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @ApiProperty({ example: '01712345678', required: false })
  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateStaffDto {
  @ApiProperty({ example: 'Tanvir Ahmed', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: '01712345678', required: false })
  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @ApiProperty({ example: 'NewPass123!', required: false })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number.',
  })
  @IsOptional()
  password?: string;
}

export class UpdateStaffStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
