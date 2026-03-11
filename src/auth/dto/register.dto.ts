import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEnum(Role, { message: 'Role must be admin, doctor or patient' })
  @IsOptional()
  role?: Role;

  /** Solo aplica cuando role = doctor */
  @IsString()
  @IsOptional()
  specialty?: string;

  /** Solo aplica cuando role = patient — ISO 8601 (ej. 1990-05-20) */
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date' })
  @IsOptional()
  birthDate?: string;
}
