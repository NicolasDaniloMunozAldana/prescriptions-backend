import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'dr@hospital.com', description: 'Email único del usuario' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'seguro123', description: 'Contraseña (mínimo 6 caracteres)', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'Carlos López', description: 'Nombre completo', minLength: 2 })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @ApiProperty({ enum: Role, description: 'Rol que se asignará al usuario' })
  @IsEnum(Role, { message: 'Role must be admin, doctor or patient' })
  role: Role;

  @ApiPropertyOptional({ example: 'Cardiología', description: 'Especialidad (solo para role=doctor)' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: '1985-07-22', description: 'Fecha de nacimiento ISO 8601 (solo para role=patient)' })
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date' })
  @IsOptional()
  birthDate?: string;
}
