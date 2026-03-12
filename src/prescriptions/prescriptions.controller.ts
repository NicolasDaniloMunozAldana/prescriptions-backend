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
  Req,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import type { Request } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryDoctorPrescriptionsDto } from './dto/query-doctor-prescriptions.dto';
import { QueryPatientPrescriptionsDto } from './dto/query-patient-prescriptions.dto';

@ApiTags('Prescriptions')
@ApiBearerAuth('access-token')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) { }

  private getFrontendBaseUrl(req: Request): string | undefined {
    const frontendOrigin = req.headers['x-frontend-origin'];
    if (typeof frontendOrigin === 'string' && frontendOrigin.length > 0) {
      return frontendOrigin;
    }

    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
      return origin;
    }

    const host = req.headers['x-forwarded-host'] ?? req.headers.host;
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto =
      (typeof forwardedProto === 'string' && forwardedProto.split(',')[0]) ||
      req.protocol ||
      'http';

    if (typeof host === 'string' && host.length > 0) {
      return `${proto}://${host}`;
    }

    return undefined;
  }

  // ─── Doctor ──────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Crear prescripcion [doctor]',
    description: 'El medico autenticado crea una prescripcion para el paciente indicado. Los items se ingresan manualmente (sin catalogo). Se genera un codigo unico RX-* automaticamente.',
  })
  @ApiCreatedResponse({ description: 'Prescripcion creada con sus items.' })
  @ApiNotFoundResponse({ description: 'Perfil de medico o paciente no encontrado.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol doctor.' })
  @Post()
  @Roles(Role.doctor)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.create(user.userId, dto);
  }

  @ApiOperation({
    summary: 'Listar prescripciones propias [doctor]',
    description: 'Retorna las prescripciones emitidas por el medico autenticado. Soporta filtros por estado, rango de fechas y paginacion.',
  })
  @ApiOkResponse({ description: 'Lista paginada de prescripciones del medico.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol doctor.' })
  @Get()
  @Roles(Role.doctor)
  findDoctorPrescriptions(
    @Query() query: QueryDoctorPrescriptionsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.findAllByDoctor(user.userId, query);
  }

  // ─── Patient ─────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Listar mis prescripciones [paciente]',
    description: 'Retorna las prescripciones del paciente autenticado. Filtrable por estado (pending/consumed) y con paginacion.',
  })
  @ApiOkResponse({ description: 'Lista paginada de prescripciones del paciente.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol patient.' })
  @Get('mine')
  @Roles(Role.patient)
  findPatientPrescriptions(
    @Query() query: QueryPatientPrescriptionsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.findAllByPatient(user.userId, query);
  }

  // ─── Shared ───────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Obtener prescripcion por ID',
    description: 'Retorna el detalle completo de una prescripcion con sus items, paciente y medico. Control de acceso: doctor solo ve las que emitio; paciente solo las suyas; admin ve cualquiera.',
  })
  @ApiParam({ name: 'id', description: 'ID cuid de la prescripcion' })
  @ApiOkResponse({ description: 'Detalle de la prescripcion.' })
  @ApiNotFoundResponse({ description: 'Prescripcion no encontrada o sin acceso.' })
  @Get(':id')
  @Roles(Role.doctor, Role.patient, Role.admin)
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.prescriptionsService.findOne(user, id);
  }

  @ApiOperation({
    summary: 'Consumir prescripcion [paciente]',
    description: 'Cambia el estado de pending a consumed y registra la fecha de consumo. Solo el paciente propietario puede ejecutar esta accion.',
  })
  @ApiParam({ name: 'id', description: 'ID cuid de la prescripcion' })
  @ApiOkResponse({ description: 'Prescripcion marcada como consumida.' })
  @ApiNotFoundResponse({ description: 'Prescripcion no encontrada o no pertenece al paciente.' })
  @ApiConflictResponse({ description: 'La prescripcion ya fue consumida anteriormente.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol patient.' })
  @Put(':id/consume')
  @Roles(Role.patient)
  consume(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.prescriptionsService.consume(user.userId, id);
  }

  @ApiOperation({
    summary: 'Descargar PDF de prescripcion',
    description: 'Genera y descarga el PDF de la prescripcion. Incluye datos del medico, paciente, fecha, codigo, items y estado. Mismo control de acceso que GET /:id.',
  })
  @ApiParam({ name: 'id', description: 'ID cuid de la prescripcion' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Archivo PDF de la prescripcion.' })
  @ApiNotFoundResponse({ description: 'Prescripcion no encontrada.' })
  @Get(':id/pdf')
  @Roles(Role.doctor, Role.patient, Role.admin)
  async getPdf(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<StreamableFile> {
    const frontendBaseUrl = this.getFrontendBaseUrl(req);
    const buffer = await this.prescriptionsService.generatePdf(
      user,
      id,
      frontendBaseUrl,
    );

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="prescription-${id}.pdf"`,
    });
  }
}
