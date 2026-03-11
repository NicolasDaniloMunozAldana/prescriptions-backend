import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { QueryAdminPrescriptionsDto } from '../prescriptions/dto/query-admin-prescriptions.dto';
import { QueryMetricsDto } from '../prescriptions/dto/query-metrics.dto';

@Controller('admin')
@Roles(Role.admin)
export class AdminController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  /**
   * GET /api/admin/prescriptions
   * Returns all prescriptions with optional filters by status, doctorId, patientId, date range.
   * Only accessible by admins.
   */
  @Get('prescriptions')
  findAllPrescriptions(@Query() query: QueryAdminPrescriptionsDto) {
    return this.prescriptionsService.findAllAdmin(query);
  }

  /**
   * GET /api/admin/prescriptions/:id
   * Returns a single prescription (admin can see any).
   */
  @Get('prescriptions/:id')
  findOnePrescription(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.findOne(user, id);
  }

  /**
   * GET /api/admin/prescriptions/:id/pdf
   * Downloads the PDF for any prescription.
   */
  @Get('prescriptions/:id/pdf')
  async getPrescriptionPdf(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<StreamableFile> {
    const buffer = await this.prescriptionsService.generatePdf(user, id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="prescription-${id}.pdf"`,
    });
  }

  /**
   * GET /api/admin/metrics?from=&to=
   * Returns aggregated metrics: totals, by-status, by-day, top doctors.
   * Only accessible by admins.
   */
  @Get('metrics')
  getMetrics(@Query() query: QueryMetricsDto) {
    return this.prescriptionsService.getMetrics(query);
  }
}
