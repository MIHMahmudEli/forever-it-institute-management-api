import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@foreveritbd.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @ApiProperty({ example: 'Admin123456!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;
}
