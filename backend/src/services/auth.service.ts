import { createHash, timingSafeEqual } from 'node:crypto';
import * as userRepo from '../repositories/user.repository.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, signToken, verifyPassword } from '../utils/auth.js';
import type { RegisterInput, LoginInput, StaffSetupInput } from '../validators/schemas.js';
import type { RoleName } from '../types/index.js';

function toPublicUser(row: {
  user_id: number; full_name: string; email: string; phone: string | null;
  enrollment_no: string | null; department: string | null; role_name?: RoleName;
}) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    enrollmentNo: row.enrollment_no,
    department: row.department,
    role: row.role_name ?? 'STUDENT',
  };
}

function secretsEqual(provided: string, expected: string) {
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

/**
 * Self-registration always creates a STUDENT. Staff accounts are created only
 * through the owner-only setup endpoint, so nobody can sign themselves up as
 * desk staff and start approving claims.
 */
export async function register(input: RegisterInput) {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('An account with that email already exists. Try signing in instead.');
  }

  const passwordHash = await hashPassword(input.password);
  const created = await userRepo.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    phone: input.phone,
    enrollmentNo: input.enrollmentNo,
    department: input.department,
    roleName: 'STUDENT',
  });

  if (!created) throw new Error('User insert returned no row');

  const user = toPublicUser({ ...created, role_name: 'STUDENT' });
  return { user, token: issueToken(user) };
}

/**
 * Owner-only path for the first (or additional) STAFF account. Disabled when
 * STAFF_SETUP_SECRET is unset so the endpoint cannot be guessed on a public
 * deployment that never opted in.
 */
export async function createStaffAccount(input: StaffSetupInput) {
  if (!env.staffSetupSecret) {
    throw ApiError.notFound();
  }
  if (!secretsEqual(input.setupSecret, env.staffSetupSecret)) {
    throw ApiError.unauthorized('That setup key is not valid.');
  }

  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('An account with that email already exists. Try signing in instead.');
  }

  const passwordHash = await hashPassword(input.password);
  const created = await userRepo.createUser({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
    phone: input.phone,
    enrollmentNo: input.enrollmentNo,
    department: input.department,
    roleName: 'STAFF',
  });

  if (!created) throw new Error('User insert returned no row');

  const user = toPublicUser({ ...created, role_name: 'STAFF' });
  return { user, token: issueToken(user) };
}

export async function login(input: LoginInput) {
  const row = await userRepo.findByEmail(input.email);

  // The same message for "no such account" and "wrong password" so the login
  // form cannot be used to discover which emails are registered.
  const genericFailure = ApiError.unauthorized('That email and password combination is not correct.');
  if (!row) {
    // Still spend the time hashing so the response time does not leak whether
    // the account exists.
    await verifyPassword(input.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw genericFailure;
  }

  const ok = await verifyPassword(input.password, row.password_hash);
  if (!ok) throw genericFailure;

  if (!row.is_active) {
    throw ApiError.forbidden('This account has been deactivated. Contact the lost & found desk.');
  }

  const user = toPublicUser(row);
  return { user, token: issueToken(user) };
}

export async function currentUser(userId: number) {
  const row = await userRepo.findById(userId);
  if (!row) throw ApiError.unauthorized('Your account could not be found.');
  return toPublicUser(row);
}

function issueToken(user: ReturnType<typeof toPublicUser>) {
  return signToken({
    sub: user.userId,
    email: user.email,
    role: user.role as RoleName,
    name: user.fullName,
  });
}
