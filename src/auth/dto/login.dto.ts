import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'dr@test.com', description: 'Email registrado del usuario' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;

  @ApiProperty({ example: 'dr123', description: 'Contraseña del usuario' })
  @IsString()
  password: string;
}
