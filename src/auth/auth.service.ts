import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: dto.role ?? Role.patient,
      },
    });

    return this.issueTokenPair(user);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokenPair(user);
  }

  // ─── Refresh (token rotation) ────────────────────────────────────────────────

  async refreshTokens(userId: string, rawRefreshToken: string) {
    const hashed = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, token: hashed, expiresAt: { gt: new Date() } },
    });
    if (!stored) throw new ForbiddenException('Refresh token invalid or expired');

    // Rotate: delete consumed token before issuing new pair
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.issueTokenPair(user);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(userId: string, rawRefreshToken: string) {
    const hashed = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: hashed },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        doctor: { select: { id: true, specialty: true } },
        patient: { select: { id: true, birthDate: true } },
      },
    });
  }

  // ─── Token helpers ────────────────────────────────────────────────────────────

  private async issueTokenPair(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessTtlStr = this.configService.get<string>('JWT_ACCESS_TTL', '900s');
    const refreshTtlStr = this.configService.get<string>('JWT_REFRESH_TTL', '7d');
    const accessTtlSec = this.parseTtlMs(accessTtlStr) / 1000;
    const refreshTtlSec = this.parseTtlMs(refreshTtlStr) / 1000;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtlSec,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtlSec,
      }),
    ]);

    const expiresAt = new Date(Date.now() + this.parseTtlMs(refreshTtlStr));
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: this.hashToken(refreshToken), expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60 * 1_000,
      h: 60 * 60 * 1_000,
      d: 24 * 60 * 60 * 1_000,
    };
    return parseInt(match[1], 10) * multipliers[match[2]];
  }
}