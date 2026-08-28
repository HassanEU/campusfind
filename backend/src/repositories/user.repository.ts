import { queryAll, queryOne, query } from '../db/pool.js';
import type { RoleName } from '../types/index.js';

export interface UserRow {
  user_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  enrollment_no: string | null;
  department: string | null;
  role_id: number;
  role_name: RoleName;
  is_active: boolean;
  created_at: string;
}

/**
 * Every statement below uses bound parameters ($1, $2 ...).  The email supplied
 * by a visitor is sent to PostgreSQL as data, never as SQL text, so a value
 * like  ' OR 1=1 --  is looked up literally and simply finds nothing.
 */
export function findByEmail(email: string) {
  return queryOne<UserRow>(
    `SELECT u.*, r.role_name
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
      WHERE u.email = $1`,
    [email],
  );
}

export function findById(userId: number) {
  return queryOne<UserRow>(
    `SELECT u.*, r.role_name
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = $1`,
    [userId],
  );
}

export async function createUser(input: {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  enrollmentNo?: string;
  department?: string;
  roleName: RoleName;
}) {
  const row = await queryOne<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, phone, enrollment_no, department, role_id)
     VALUES ($1, $2, $3, $4, $5, $6, (SELECT role_id FROM roles WHERE role_name = $7))
     RETURNING user_id, full_name, email, password_hash, phone, enrollment_no,
               department, role_id, is_active, created_at`,
    [
      input.fullName,
      input.email,
      input.passwordHash,
      input.phone ?? null,
      input.enrollmentNo ?? null,
      input.department ?? null,
      input.roleName,
    ],
  );

  if (row) {
    await query(
      `SELECT fn_write_audit($1, 'USER_REGISTERED', 'USER', $1, jsonb_build_object('role', $2::text))`,
      [row.user_id, input.roleName],
    );
  }

  return row;
}

export function listUsers() {
  return queryAll(
    `SELECT u.user_id, u.full_name, u.email, u.phone, u.enrollment_no, u.department,
            u.is_active, u.created_at, u.role_id, r.role_name,
            -- Per-user activity, computed with correlated subqueries so the
            -- admin table can be sorted by how active someone is.
            (SELECT COUNT(*) FROM lost_items  l WHERE l.reported_by = u.user_id) AS lost_reports,
            (SELECT COUNT(*) FROM found_items f WHERE f.reported_by = u.user_id) AS found_reports,
            (SELECT COUNT(*) FROM claims      c WHERE c.claimant_id = u.user_id) AS claims_made
       FROM users u
       INNER JOIN roles r ON r.role_id = u.role_id
      ORDER BY r.role_id, u.full_name`,
  );
}

export function updateUser(userId: number, patch: { roleId?: number; isActive?: boolean }) {
  return queryOne(
    `UPDATE users
        SET role_id   = COALESCE($2, role_id),
            is_active = COALESCE($3, is_active)
      WHERE user_id = $1
      RETURNING user_id, full_name, email, role_id, is_active`,
    [userId, patch.roleId ?? null, patch.isActive ?? null],
  );
}
