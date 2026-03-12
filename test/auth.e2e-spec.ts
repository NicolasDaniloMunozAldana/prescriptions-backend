/**
 * Auth endpoints – E2E tests
 *
 * These tests spin up the full NestJS app but override PrismaService
 * with a mock, so no real database connection is required.
 *
 * Run with:   npm run test:e2e
 */

// Set JWT secrets before any module is imported
process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret-min-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-min-32-chars!';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ─── Prisma mock (no real DB needed) ──────────────────────────────────────────

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  refreshToken: {
    create: jest.fn().mockResolvedValue({}),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  // Required by JWT strategy's validate hook to load the user
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();

    // Mirror production bootstrap settings
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  // ─── POST /api/auth/register ──────────────────────────────────────────────

  describe('POST /api/auth/register – input validation', () => {
    it('400 – missing email field', () =>
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ password: 'secret123', name: 'Alice' })
        .expect(400));

    it('400 – password shorter than 6 characters', () =>
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'alice@example.com', password: '123', name: 'Alice' })
        .expect(400));

    it('400 – name shorter than 2 characters', () =>
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'alice@example.com', password: 'pass123', name: 'A' })
        .expect(400));

    it('400 – invalid email format', () =>
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'pass123', name: 'Alice' })
        .expect(400));
  });

  // ─── POST /api/auth/login ─────────────────────────────────────────────────

  describe('POST /api/auth/login – input validation', () => {
    it('400 – empty request body', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400));

    it('400 – invalid email format', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'pass123' })
        .expect(400));
  });

  describe('POST /api/auth/login – business logic', () => {
    it('401 – email not registered (user not found)', () => {
      // Mock returns null → AuthService throws UnauthorizedException
      prismaMock.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);
    });
  });

  // ─── GET /api/auth/profile ────────────────────────────────────────────────

  describe('GET /api/auth/profile', () => {
    it('401 – request without Authorization header', () =>
      request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401));

    it('401 – request with malformed Bearer token', () =>
      request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer this-is-not-a-valid-jwt')
        .expect(401));
  });
});
