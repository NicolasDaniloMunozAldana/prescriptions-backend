import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';

export class QueryAdminPrescriptionsDto {
  @ApiPropertyOptional({ enum: PrescriptionStatus, description: 'Filtrar por estado' })
  @IsEnum(PrescriptionStatus)
  @IsOptional()
  status?: PrescriptionStatus;

  @ApiPropertyOptional({ example: 'cldxyz123abc', description: 'ID cuid del perfil Doctor para filtrar' })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({ example: 'cldxyz456def', description: 'ID cuid del perfil Patient para filtrar' })
  @IsString()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Fecha de inicio ISO 8601' })
  @IsISO8601()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Fecha de fin ISO 8601' })
  @IsISO8601()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
