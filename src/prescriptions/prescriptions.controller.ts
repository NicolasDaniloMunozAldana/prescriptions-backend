import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryDoctorPrescriptionsDto } from './dto/query-doctor-prescriptions.dto';
import { QueryPatientPrescriptionsDto } from './dto/query-patient-prescriptions.dto';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  // ─── Doctor ──────────────────────────────────────────────────────────────────

  /**
   * POST /api/prescriptions
   * Creates a new prescription with manually entered items.
   * Only accessible by doctors.
   */
  @Post()
  @Roles(Role.doctor)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.create(user.userId, dto);
  }

  /**
   * GET /api/prescriptions
   * Lists the authenticated doctor's prescriptions (paginated + filtered).
   * Only accessible by doctors.
   */
  @Get()
  @Roles(Role.doctor)
  findDoctorPrescriptions(
    @Query() query: QueryDoctorPrescriptionsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.findAllByDoctor(user.userId, query);
  }

  // ─── Patient ─────────────────────────────────────────────────────────────────
  // NOTE: literal routes ("mine") MUST be defined before parameterized (":id")
  // to prevent NestJS from matching "mine" as an id parameter.

  /**
   * GET /api/prescriptions/mine
   * Lists the authenticated patient's prescriptions (paginated + filtered).
   * Only accessible by patients.
   */
  @Get('mine')
  @Roles(Role.patient)
  findPatientPrescriptions(
    @Query() query: QueryPatientPrescriptionsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.findAllByPatient(user.userId, query);
  }

  // ─── Shared ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/prescriptions/:id
   * Returns a single prescription.
   * - Doctor: only if they authored it.
   * - Patient: only if it belongs to them.
   * - Admin: any prescription.
   */
  @Get(':id')
  @Roles(Role.doctor, Role.patient, Role.admin)
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.prescriptionsService.findOne(user, id);
  }

  /**
   * PUT /api/prescriptions/:id/consume
   * Marks a prescription as consumed (pending → consumed).
   * Only accessible by the owning patient.
   */
  @Put(':id/consume')
  @Roles(Role.patient)
  consume(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.prescriptionsService.consume(user.userId, id);
  }

  /**
   * GET /api/prescriptions/:id/pdf
   * Downloads a PDF of the prescription.
   * Access control mirrors GET /prescriptions/:id (ownership enforced).
   */
  @Get(':id/pdf')
  @Roles(Role.doctor, Role.patient, Role.admin)
  async getPdf(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<StreamableFile> {
    const buffer = await this.prescriptionsService.generatePdf(user, id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="prescription-${id}.pdf"`,
    });
  }
}
