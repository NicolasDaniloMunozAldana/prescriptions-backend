import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';

export class QueryPatientPrescriptionsDto {
  @ApiPropertyOptional({ enum: PrescriptionStatus, description: 'Filtrar por estado de la prescripción' })
  @IsEnum(PrescriptionStatus)
  @IsOptional()
  status?: PrescriptionStatus;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página (base 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Resultados por página (máx. 100)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Dirección de ordenamiento por fecha de creación' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
