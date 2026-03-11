import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryDoctorPrescriptionsDto } from './dto/query-doctor-prescriptions.dto';
import { QueryPatientPrescriptionsDto } from './dto/query-patient-prescriptions.dto';
import { QueryAdminPrescriptionsDto } from './dto/query-admin-prescriptions.dto';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import {
  FullPrescription,
  generatePrescriptionPdf,
} from './pdf/prescription-pdf.generator';

// ─── Shared Prisma include ────────────────────────────────────────────────────

const PRESCRIPTION_INCLUDE = {
  items: true,
  patient: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  author: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

// ─── Helper: build date range filter ─────────────────────────────────────────

function dateRangeFilter(from?: string, to?: string) {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  };
}

// ─── Helper: unique prescription code ────────────────────────────────────────

function generateCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RX-${ts}-${rand}`;
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Doctor: create ────────────────────────────────────────────────────────

  async create(userId: string, dto: CreatePrescriptionDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.prescription.create({
      data: {
        code: generateCode(),
        notes: dto.notes,
        patientId: dto.patientId,
        authorId: doctor.id,
        items: {
          create: dto.items.map((item) => ({
            name: item.name,
            dosage: item.dosage,
            quantity: item.quantity,
            instructions: item.instructions,
          })),
        },
      },
      include: PRESCRIPTION_INCLUDE,
    });
  }

  // ─── Doctor: list own prescriptions ───────────────────────────────────────

  async findAllByDoctor(userId: string, query: QueryDoctorPrescriptionsDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const { status, from, to, page = 1, limit = 20, order = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = {
      authorId: doctor.id,
      ...(status ? { status } : {}),
      ...dateRangeFilter(from, to),
    };

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: PRESCRIPTION_INCLUDE,
        orderBy: { createdAt: order },
        skip,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Patient: list own prescriptions ──────────────────────────────────────

  async findAllByPatient(userId: string, query: QueryPatientPrescriptionsDto) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const { status, page = 1, limit = 20, order = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = {
      patientId: patient.id,
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: PRESCRIPTION_INCLUDE,
        orderBy: { createdAt: order },
        skip,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Shared: get single prescription (with ownership enforcement) ──────────

  async findOne(user: RequestUser, id: string) {
    if (user.role === Role.admin) {
      const prescription = await this.prisma.prescription.findUnique({
        where: { id },
        include: PRESCRIPTION_INCLUDE,
      });
      if (!prescription) throw new NotFoundException('Prescription not found');
      return prescription;
    }

    if (user.role === Role.doctor) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: user.userId },
      });
      if (!doctor) throw new NotFoundException('Doctor profile not found');

      const prescription = await this.prisma.prescription.findFirst({
        where: { id, authorId: doctor.id },
        include: PRESCRIPTION_INCLUDE,
      });
      if (!prescription) throw new NotFoundException('Prescription not found');
      return prescription;
    }

    // patient
    const patient = await this.prisma.patient.findUnique({
      where: { userId: user.userId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const prescription = await this.prisma.prescription.findFirst({
      where: { id, patientId: patient.id },
      include: PRESCRIPTION_INCLUDE,
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  // ─── Patient: mark as consumed ─────────────────────────────────────────────

  async consume(userId: string, id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const prescription = await this.prisma.prescription.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status === 'consumed') {
      throw new ConflictException('Prescription is already consumed');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'consumed', consumedAt: new Date() },
      include: PRESCRIPTION_INCLUDE,
    });
  }

  // ─── Shared: generate PDF (ownership enforced by findOne) ──────────────────

  async generatePdf(user: RequestUser, id: string): Promise<Buffer> {
    // Reuse findOne — ownership rules are already enforced per role
    const prescription = (await this.findOne(user, id)) as FullPrescription;
    return generatePrescriptionPdf(prescription);
  }

  // ─── Admin: list all prescriptions ────────────────────────────────────────

  async findAllAdmin(query: QueryAdminPrescriptionsDto) {
    const {
      status,
      doctorId,
      patientId,
      from,
      to,
      page = 1,
      limit = 20,
      order = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(doctorId ? { authorId: doctorId } : {}),
      ...(patientId ? { patientId } : {}),
      ...dateRangeFilter(from, to),
    };

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: PRESCRIPTION_INCLUDE,
        orderBy: { createdAt: order },
        skip,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Admin: metrics ────────────────────────────────────────────────────────

  async getMetrics(query: QueryMetricsDto) {
    const { from, to } = query;

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const prescriptionWhere = {
      createdAt: { gte: fromDate, lte: toDate },
    };

    const [
      totalDoctors,
      totalPatients,
      totalPrescriptions,
      byStatus,
      prescriptionsByDay,
      topDoctors,
    ] = await Promise.all([
      this.prisma.doctor.count(),
      this.prisma.patient.count(),
      this.prisma.prescription.count({ where: prescriptionWhere }),
      this.prisma.prescription.groupBy({
        by: ['status'],
        where: prescriptionWhere,
        _count: { status: true },
      }),
      // Raw query to group by calendar day (Prisma groupBy doesn't support DATE truncation)
      this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
        FROM "Prescription"
        WHERE "createdAt" >= ${fromDate}
          AND "createdAt" <= ${toDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      this.prisma.prescription.groupBy({
        by: ['authorId'],
        where: prescriptionWhere,
        _count: { authorId: true },
        orderBy: { _count: { authorId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totals: {
        doctors: totalDoctors,
        patients: totalPatients,
        prescriptions: totalPrescriptions,
      },
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count.status]),
      ),
      byDay: prescriptionsByDay.map((r) => ({
        date:
          r.date instanceof Date
            ? r.date.toISOString().split('T')[0]
            : String(r.date),
        count: Number(r.count),
      })),
      topDoctors: topDoctors.map((d) => ({
        doctorId: d.authorId,
        count: d._count.authorId,
      })),
    };
  }
}
