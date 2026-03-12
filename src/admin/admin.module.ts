import { Module } from '@nestjs/common';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [PrescriptionsModule],
  controllers: [AdminController],
})
export class AdminModule {}

