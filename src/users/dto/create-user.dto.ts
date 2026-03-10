import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEnum(Role, { message: 'Role must be admin, doctor or patient' })
  role: Role;

  /** Only for doctors */
  @IsString()
  @IsOptional()
  specialty?: string;

  /** Only for patients — ISO 8601 date string */
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date' })
  @IsOptional()
  birthDate?: string;
}
