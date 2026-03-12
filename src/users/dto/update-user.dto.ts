import {
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nuevo Nombre', description: 'Nombre completo del usuario' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Neurología', description: 'Especialidad (solo para médicos)' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: '1990-03-15', description: 'Fecha de nacimiento ISO 8601 (solo para pacientes)' })
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date' })
  @IsOptional()
  birthDate?: string;
}
