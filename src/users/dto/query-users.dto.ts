import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class QueryUsersDto {
  @ApiPropertyOptional({ enum: Role, description: 'Filtrar por rol' })
  @IsEnum(Role, { message: 'role must be admin, doctor or patient' })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: 'Carlos', description: 'Búsqueda de texto libre en nombre o email' })
  @IsString()
  @IsOptional()
  query?: string;

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
}
