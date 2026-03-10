import {
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  /** Only for doctors */
  @IsString()
  @IsOptional()
  specialty?: string;

  /** Only for patients — ISO 8601 date string */
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date' })
  @IsOptional()
  birthDate?: string;
}
