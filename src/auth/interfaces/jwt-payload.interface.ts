import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface RequestUser {
  userId: string;
  email: string;
  role: Role;
}

export interface RequestUserWithRefresh extends RequestUser {
  refreshToken: string;
}
