import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// bcrypt is mocked so tests don't do real hashing (fast + no crypto deps)
jest.mock('bcrypt');

// ─── Shared fake user ─────────────────────────────────────────────────────────

const baseUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: Role.patient,
  createdAt: new Date('2026-01-01'),
  doctor: null,
  patient: { id: 'patient-1', birthDate: null },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  // Manual mock – mirrors only the methods used by UsersService
  const prismaMock = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated data and computes totalPages correctly', async () => {
      prismaMock.user.findMany.mockResolvedValue([baseUser]);
      prismaMock.user.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.data).toEqual([baseUser]);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3, // ceil(25 / 10)
      });
      // page 2 with limit 10 → skip the first 10 records
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('applies role filter when provided', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await service.findAll({ role: Role.doctor });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: Role.doctor }),
        }),
      );
    });

    it('applies text search on name and email when query is provided', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await service.findAll({ query: 'Smith' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the user when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(baseUser);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ConflictException when email is already in use', async () => {
      prismaMock.user.findUnique.mockResolvedValue(baseUser); // email exists

      await expect(
        service.create({
          email: 'alice@example.com',
          password: 'pass123',
          name: 'Alice',
          role: Role.patient,
        }),
      ).rejects.toThrow(ConflictException);

      // Should not attempt to create
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('creates a doctor user with specialty', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // email available
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const doctorUser = {
        ...baseUser,
        role: Role.doctor,
        doctor: { id: 'd-1', specialty: 'Cardiología' },
        patient: null,
      };
      prismaMock.user.create.mockResolvedValue(doctorUser);

      const result = await service.create({
        email: 'doc@example.com',
        password: 'pass123',
        name: 'Dr. Smith',
        role: Role.doctor,
        specialty: 'Cardiología',
      });

      expect(result.role).toBe(Role.doctor);
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });

    it('creates a patient user with birth date', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaMock.user.create.mockResolvedValue(baseUser);

      await service.create({
        email: 'patient@example.com',
        password: 'pass123',
        name: 'Bob',
        role: Role.patient,
        birthDate: '1990-05-15',
      });

      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the user and returns a success message', async () => {
      prismaMock.user.findUnique.mockResolvedValue(baseUser);
      prismaMock.user.delete.mockResolvedValue(baseUser);

      const result = await service.remove('user-1');

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
