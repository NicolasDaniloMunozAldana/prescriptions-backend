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
@ApiForbiddenResponse({ description: 'Se requiere rol admin.' })
@Controller('patients')
@Roles(Role.admin)
export class PatientsController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Listar pacientes [admin]',
    description: 'Retorna todos los usuarios con rol `patient`. Filtrable por nombre/email y soporta paginación.',
  })
  @ApiOkResponse({ description: 'Lista paginada de pacientes.' })
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll({ ...query, role: Role.patient });
  }
}
