import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrescriptionItemDto {
  @ApiProperty({ example: 'Amoxicilina 500mg', description: 'Nombre del medicamento o tratamiento ingresado manualmente' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '1 cápsula cada 8 horas', description: 'Dosis y frecuencia' })
  @IsString()
  @IsOptional()
  dosage?: string;

  @ApiPropertyOptional({ example: 21, description: 'Cantidad de unidades indicadas', minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 'Tomar después de comer', description: 'Instrucciones adicionales para el paciente' })
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'cldxyz123abc', description: 'ID cuid del perfil Patient al que va dirigida la prescripción' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ example: 'Paciente alérgico a penicilina', description: 'Notas generales de la prescripción' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [PrescriptionItemDto],
    description: 'Lista de ítems de la prescripción (mínimo 1). Los medicamentos se ingresan manualmente, sin catálogo.',
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'La prescripción debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
