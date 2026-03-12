import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PatientsController],
})
export class PatientsModule {}
