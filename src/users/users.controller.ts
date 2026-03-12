import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Se requiere rol admin.' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Listar usuarios', description: 'Retorna todos los usuarios paginados. Filtra por rol o texto libre (nombre/email).' })
  @ApiOkResponse({ description: 'Lista paginada de usuarios.' })
  @Roles(Role.admin)
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID cuid del usuario' })
  @ApiOkResponse({ description: 'Usuario encontrado con su perfil vinculado.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Roles(Role.admin)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Crear usuario', description: 'Crea un usuario con el rol indicado y genera automáticamente el perfil Doctor o Patient según corresponda.' })
  @ApiCreatedResponse({ description: 'Usuario creado exitosamente.' })
  @Roles(Role.admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @ApiOperation({ summary: 'Actualizar usuario', description: 'Actualiza nombre y/o campos del perfil según el rol del usuario (specialty para doctor, birthDate para patient).' })
  @ApiParam({ name: 'id', description: 'ID cuid del usuario' })
  @ApiOkResponse({ description: 'Usuario actualizado.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Roles(Role.admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Eliminar usuario', description: 'Elimina el usuario y en cascada su perfil Doctor/Patient y tokens de refresco.' })
  @ApiParam({ name: 'id', description: 'ID cuid del usuario' })
  @ApiOkResponse({ description: 'Usuario eliminado.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Roles(Role.admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
