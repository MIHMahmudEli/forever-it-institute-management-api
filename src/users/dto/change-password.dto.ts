import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentSecurePass123!' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'New password must contain at least one letter and one number.',
  })
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required.' })
  confirmPassword: string;
}

export class UpdateAccountDto {
  @ApiProperty({ example: 'Mahmudul Hasan', required: true })
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty.' })
  fullName: string;
}
