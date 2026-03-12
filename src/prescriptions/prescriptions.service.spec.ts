import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';

// Prevent loading pdfkit (native binary) in the unit test environment
jest.mock('./pdf/prescription-pdf.generator', () => ({
  generatePrescriptionPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-stub')),
}));

// ─── Shared fake data ─────────────────────────────────────────────────────────

const fakePrescription = {
  id: 'rx-1',
  code: 'RX-TEST-0001',
  status: 'pending',
  notes: null,
  createdAt: new Date('2026-01-15'),
  consumedAt: null,
  items: [
    { id: 'item-1', name: 'Ibuprofen', dosage: '400mg', quantity: 30, instructions: null },
  ],
  patient: {
    id: 'p-1',
    user: { id: 'u-2', name: 'Bob Patient', email: 'bob@example.com' },
  },
  author: {
    specialty: 'Cardiología',
    user: { id: 'u-1', name: 'Dr. Smith', email: 'doc@example.com' },
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;

  const prismaMock = {
    doctor: { findUnique: jest.fn(), count: jest.fn() },
    patient: { findUnique: jest.fn(), count: jest.fn() },
    prescription: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException when doctor profile does not exist', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          patientId: 'p-1',
          items: [{ name: 'Ibuprofen' }],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.prescription.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when patient does not exist', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue({ id: 'd-1', userId: 'user-1' });
      prismaMock.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          patientId: 'nonexistent-patient',
          items: [{ name: 'Ibuprofen' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates prescription and returns it when doctor and patient exist', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue({ id: 'd-1', userId: 'user-1' });
      prismaMock.patient.findUnique.mockResolvedValue({ id: 'p-1' });
      prismaMock.prescription.create.mockResolvedValue(fakePrescription);

      const result = await service.create('user-1', {
        patientId: 'p-1',
        items: [{ name: 'Ibuprofen', dosage: '400mg', quantity: 30 }],
      });

      expect(result).toEqual(fakePrescription);
      // Verify the prescription is linked to the correct patient and doctor
      expect(prismaMock.prescription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'p-1',
            authorId: 'd-1',
          }),
        }),
      );
    });

    it('generates a unique alphanumeric code (RX-... format)', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue({ id: 'd-1' });
      prismaMock.patient.findUnique.mockResolvedValue({ id: 'p-1' });
      prismaMock.prescription.create.mockResolvedValue(fakePrescription);

      await service.create('user-1', { patientId: 'p-1', items: [{ name: 'Med' }] });

      const createCall = prismaMock.prescription.create.mock.calls[0][0];
      expect(createCall.data.code).toMatch(/^RX-/);
    });
  });

  // ─── findAllByDoctor ──────────────────────────────────────────────────────

  describe('findAllByDoctor', () => {
    it('throws NotFoundException when doctor profile does not exist', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findAllByDoctor('user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns paginated prescriptions with correct meta', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue({ id: 'd-1' });
      prismaMock.prescription.findMany.mockResolvedValue([fakePrescription]);
      prismaMock.prescription.count.mockResolvedValue(30);

      const result = await service.findAllByDoctor('user-1', {
        page: 2,
        limit: 10,
      });

      expect(result.data).toEqual([fakePrescription]);
      expect(result.meta).toEqual({
        total: 30,
        page: 2,
        limit: 10,
        totalPages: 3, // ceil(30 / 10)
      });
    });

    it('filters by status when provided', async () => {
      prismaMock.doctor.findUnique.mockResolvedValue({ id: 'd-1' });
      prismaMock.prescription.findMany.mockResolvedValue([]);
      prismaMock.prescription.count.mockResolvedValue(0);

      await service.findAllByDoctor('user-1', { status: 'pending' });

      expect(prismaMock.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });
  });

  // ─── consume ─────────────────────────────────────────────────────────────

  describe('consume', () => {
    it('throws NotFoundException when patient profile does not exist', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(null);

      await expect(service.consume('user-1', 'rx-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when prescription does not belong to this patient', async () => {
      prismaMock.patient.findUnique.mockResolvedValue({ id: 'p-1' });
      prismaMock.prescription.findFirst.mockResolvedValue(null);

      await expect(service.consume('user-1', 'rx-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when prescription is already consumed', async () => {
      prismaMock.patient.findUnique.mockResolvedValue({ id: 'p-1' });
      prismaMock.prescription.findFirst.mockResolvedValue({
        ...fakePrescription,
        status: 'consumed',
      });

      await expect(service.consume('user-1', 'rx-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('marks prescription as consumed and sets consumedAt timestamp', async () => {
      prismaMock.patient.findUnique.mockResolvedValue({ id: 'p-1' });
      prismaMock.prescription.findFirst.mockResolvedValue(fakePrescription); // status: 'pending'
      const consumed = {
        ...fakePrescription,
        status: 'consumed',
        consumedAt: new Date(),
      };
      prismaMock.prescription.update.mockResolvedValue(consumed);

      const result = await service.consume('user-1', 'rx-1');

      expect(result.status).toBe('consumed');
      expect(prismaMock.prescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'consumed' }),
        }),
      );
    });
  });
});
