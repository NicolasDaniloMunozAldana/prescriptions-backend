import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { QueryUsersDto } from '../users/dto/query-users.dto';

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Se requiere rol admin o doctor.' })
@Controller('patients')
export class PatientsController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Listar pacientes [admin, doctor]',
    description: 'Retorna todos los usuarios con rol `patient`. Filtrable por nombre/email y soporta paginación. Accesible por admin y doctor.',
  })
  @ApiOkResponse({ description: 'Lista paginada de pacientes.' })
  @Roles(Role.admin, Role.doctor)
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll({ ...query, role: Role.patient });
  }
}
