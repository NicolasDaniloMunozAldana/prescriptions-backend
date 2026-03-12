import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// bcrypt is mocked so tests run without real hashing
jest.mock('bcrypt');

// ─── Shared fake data ─────────────────────────────────────────────────────────

const fakeUser = {
  id: 'user-1',
  email: 'alice@example.com',
  password: 'hashed-password',
  name: 'Alice',
  role: Role.patient,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn(),
  };

  const configMock = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();

    // Re-apply defaults after clearAllMocks
    jwtMock.signAsync.mockResolvedValue('mocked-jwt-token');
    configMock.get.mockReturnValue('900s');     // access TTL
    configMock.getOrThrow.mockReturnValue('test-secret');
    prismaMock.refreshToken.create.mockResolvedValue({});
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: fakeUser.email, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns accessToken and refreshToken on valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: fakeUser.email,
        password: 'correct-pass',
      });

      expect(result).toHaveProperty('accessToken', 'mocked-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'mocked-jwt-token');
    });

    it('stores the hashed refresh token in the DB', async () => {
      prismaMock.user.findUnique.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ email: fakeUser.email, password: 'correct-pass' });

      expect(prismaMock.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException when email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue(fakeUser);

      await expect(
        service.register({
          email: fakeUser.email,
          password: 'pass123',
          name: 'Alice',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('creates user and returns token pair for a new email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaMock.user.create.mockResolvedValue(fakeUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'pass123',
        name: 'New User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── refreshTokens ────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('throws ForbiddenException when token is not found or is expired', async () => {
      prismaMock.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-1', 'invalid-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rotates token: deletes old and issues new pair', async () => {
      prismaMock.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
      });
      prismaMock.refreshToken.delete.mockResolvedValue({});
      prismaMock.user.findUniqueOrThrow.mockResolvedValue(fakeUser);

      const result = await service.refreshTokens('user-1', 'valid-token');

      // Old token was consumed
      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
      // New pair was issued
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the refresh token from the DB', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'some-refresh-token');

      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
