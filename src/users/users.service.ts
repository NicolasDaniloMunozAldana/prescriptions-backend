import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

/** Fields always returned. Password is never exposed. */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  doctor: { select: { id: true, specialty: true } },
  patient: { select: { id: true, birthDate: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List (paginated + filtered) ─────────────────────────────────────────────

  async findAll(dto: QueryUsersDto) {
    const { role, query, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where = {
      ...(role ? { role } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get one ──────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  // ─── Create (Admin panel) ────────────────────────────────────────────────────

  async create(dto: CreateUserDto) {
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
        role: dto.role,
        ...(dto.role === Role.doctor
          ? { doctor: { create: { specialty: dto.specialty ?? null } } }
          : {}),
        ...(dto.role === Role.patient
          ? {
              patient: {
                create: {
                  birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                },
              },
            }
          : {}),
      },
      select: USER_SELECT,
    });

    return user;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(user.role === Role.doctor && dto.specialty !== undefined
          ? {
              doctor: {
                upsert: {
                  create: { specialty: dto.specialty },
                  update: { specialty: dto.specialty },
                },
              },
            }
          : {}),
        ...(user.role === Role.patient && dto.birthDate !== undefined
          ? {
              patient: {
                upsert: {
                  create: { birthDate: new Date(dto.birthDate) },
                  update: { birthDate: new Date(dto.birthDate) },
                },
              },
            }
          : {}),
      },
      select: USER_SELECT,
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // Cascade handled by Prisma schema (onDelete: Cascade on Doctor/Patient/RefreshToken)
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}

