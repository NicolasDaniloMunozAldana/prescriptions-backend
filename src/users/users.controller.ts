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
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}


  @Roles(Role.admin)
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  /**
   * GET /api/users/:id
   * Returns a single user with linked doctor/patient profile.
   * Only accessible by admins.
   */
  @Roles(Role.admin)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * POST /api/users
   * Creates a user with the specified role (plus doctor/patient profile).
   * Only accessible by admins.
   */
  @Roles(Role.admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * PATCH /api/users/:id
   * Updates name and/or role-specific profile fields.
   * Only accessible by admins.
   */
  @Roles(Role.admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * DELETE /api/users/:id
   * Hard-deletes a user (cascades to Doctor/Patient/RefreshToken via schema).
   * Only accessible by admins.
   */
  @Roles(Role.admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
