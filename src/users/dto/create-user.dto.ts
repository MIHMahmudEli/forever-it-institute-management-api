import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity.js';

export class CreateUserDto {
  @ApiProperty({ example: 'staff2@foreveritbd.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @ApiProperty({ example: 'Tanvir Ahmed' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ enum: UserRole, default: UserRole.STAFF })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'Tanvir Ahmed', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 'NewSecurePassword123!', required: false })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isActive?: boolean;
}
