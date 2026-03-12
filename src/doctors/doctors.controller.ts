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

@ApiTags('Doctors')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Se requiere rol admin.' })
@Controller('doctors')
@Roles(Role.admin)
export class DoctorsController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Listar médicos [admin]',
    description: 'Retorna todos los usuarios con rol `doctor`. Filtrable por nombre/email y soporta paginación.',
  })
  @ApiOkResponse({ description: 'Lista paginada de médicos.' })
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll({ ...query, role: Role.doctor });
  }
}
