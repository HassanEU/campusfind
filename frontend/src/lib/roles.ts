import type { Role } from '@/types';

/** Desk-side accounts. ADMIN is a leftover seed row, treated as STAFF in the product. */
export function isDeskRole(role?: Role | null) {
  return role === 'STAFF' || role === 'ADMIN';
}

export function homeFor(role?: Role | null) {
  return isDeskRole(role) ? '/staff' : '/app';
}

export function roleAllowed(userRole: Role, allowed?: Role[]) {
  if (!allowed) return true;
  if (allowed.includes(userRole)) return true;
  return userRole === 'ADMIN' && allowed.includes('STAFF');
}

export function roleLabel(role: Role) {
  if (role === 'STUDENT') return 'Student';
  return 'Desk staff';
}
