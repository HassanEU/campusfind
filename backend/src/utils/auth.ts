import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { RoleName } from '../types/index.js';

export interface TokenPayload {
  sub: number;
  email: string;
  role: RoleName;
  name: string;
}

/** Passwords are hashed with bcrypt. The plaintext never leaves this function. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'campusfind',
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwt.secret, { issuer: 'campusfind' }) as unknown as TokenPayload;
}
