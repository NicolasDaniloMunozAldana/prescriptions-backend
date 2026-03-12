import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [DoctorsController],
})
export class DoctorsModule {}
