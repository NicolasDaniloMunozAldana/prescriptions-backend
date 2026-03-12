import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  // Export service so AdminModule can use it for admin prescription listing
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}

