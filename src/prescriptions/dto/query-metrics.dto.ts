import { IsISO8601, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMetricsDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Fecha de inicio del rango (ISO 8601). Por defecto: hace 30 días.' })
  @IsISO8601()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Fecha de fin del rango (ISO 8601). Por defecto: hoy.' })
  @IsISO8601()
  @IsOptional()
  to?: string;
}
