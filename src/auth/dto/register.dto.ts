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

export class RegisterDto {
  @ApiProperty({ example: 'nuevo@email.com', description: 'Email único del usuario' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'seguro123', description: 'Contraseña (mínimo 6 caracteres)', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'María García', description: 'Nombre completo', minLength: 2 })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.patient,
    description: 'Rol del usuario. Por defecto: patient',
  })
  @IsEnum(Role, { message: 'Role must be admin, doctor or patient' })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: 'Cardiología', description: 'Especialidad médica (solo role=doctor)' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: '1990-05-20', description: 'Fecha de nacimiento ISO 8601 (solo role=patient)' })
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date' })
  @IsOptional()
  birthDate?: string;
}
