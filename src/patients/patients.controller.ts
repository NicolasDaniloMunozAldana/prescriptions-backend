import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { QueryUsersDto } from '../users/dto/query-users.dto';

@Controller('patients')
@Roles(Role.admin)
export class PatientsController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/patients
   * Returns all users with role=patient (paginated + filterable by name/email query).
   * Only accessible by admins.
   */
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll({ ...query, role: Role.patient });
  }
}
