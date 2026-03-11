import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { QueryAdminPrescriptionsDto } from '../prescriptions/dto/query-admin-prescriptions.dto';
import { QueryMetricsDto } from '../prescriptions/dto/query-metrics.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Se requiere rol admin.' })
@Controller('admin')
@Roles(Role.admin)
export class AdminController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  @ApiOperation({
    summary: 'Listar todas las prescripciones [admin]',
    description: 'Retorna todas las prescripciones del sistema. Filtrable por estado, médico, paciente y rango de fechas. Soporta paginación.',
  })
  @ApiOkResponse({ description: 'Lista paginada de prescripciones.' })
  @Get('prescriptions')
  findAllPrescriptions(@Query() query: QueryAdminPrescriptionsDto) {
    return this.prescriptionsService.findAllAdmin(query);
  }

  @ApiOperation({
    summary: 'Obtener prescripción por ID [admin]',
    description: 'Retorna el detalle completo de cualquier prescripción del sistema, incluyendo ítems, médico y paciente.',
  })
  @ApiParam({ name: 'id', description: 'ID cuid de la prescripción' })
  @ApiOkResponse({ description: 'Detalle de la prescripción.' })
  @ApiNotFoundResponse({ description: 'Prescripción no encontrada.' })
  @Get('prescriptions/:id')
  findOnePrescription(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.prescriptionsService.findOne(user, id);
  }

  @ApiOperation({
    summary: 'Descargar PDF de prescripción [admin]',
    description: 'Genera y descarga el PDF de cualquier prescripción del sistema.',
  })
  @ApiParam({ name: 'id', description: 'ID cuid de la prescripción' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Archivo PDF de la prescripción.' })
  @ApiNotFoundResponse({ description: 'Prescripción no encontrada.' })
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

  @ApiOperation({
    summary: 'Métricas de prescripciones [admin]',
    description: 'Retorna métricas agregadas: total, por estado (`pending`/`consumed`), por día y top médicos emisores. Filtrable por rango de fechas (`from` / `to` en formato ISO).',
  })
  @ApiOkResponse({
    description: 'Métricas calculadas.',
    schema: {
      example: {
        total: 120,
        byStatus: { pending: 80, consumed: 40 },
        byDay: [{ date: '2026-03-10', count: 5 }],
        topDoctors: [{ doctorId: 'cuid…', name: 'Dr. Smith', count: 30 }],
      },
    },
  })
  @Get('metrics')
  getMetrics(@Query() query: QueryMetricsDto) {
    return this.prescriptionsService.getMetrics(query);
  }
}
