import { IsISO8601, IsOptional } from 'class-validator';

export class QueryMetricsDto {
  /** Fecha de inicio ISO 8601  */
  @IsISO8601()
  @IsOptional()
  from?: string;

  /** Fecha de fin ISO 8601  */
  @IsISO8601()
  @IsOptional()
  to?: string;
}
