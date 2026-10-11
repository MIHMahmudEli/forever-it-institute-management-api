import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@foreveritbd.com or FIT-202610-0001',
    description: 'User email address or student registration number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or Student Registration Number cannot be empty.' })
  email: string;

  @ApiProperty({ example: 'Admin123456!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;
}
