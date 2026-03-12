import { IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';

export class QueryDoctorPrescriptionsDto {
  @ApiPropertyOptional({ enum: PrescriptionStatus, description: 'Filtrar por estado de la prescripción' })
  @IsEnum(PrescriptionStatus)
  @IsOptional()
  status?: PrescriptionStatus;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Fecha de inicio (ISO 8601). Filtra prescripciones creadas desde esta fecha.' })
  @IsISO8601()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Fecha de fin (ISO 8601). Filtra prescripciones creadas hasta esta fecha.' })
  @IsISO8601()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página (base 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Resultados por página (máx. 10)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Dirección de ordenamiento por fecha de creación' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
