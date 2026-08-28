import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/auth.js';
import type { RoleName } from '../types/index.js';

/**
 * Authentication: is this request carrying a valid, unexpired token?
 * Populates req.user so every downstream handler knows who is asking.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized());
    return;
  }

  const payload = verifyToken(header.slice('Bearer '.length).trim());

  req.user = {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    fullName: payload.name,
  };

  next();
};

/**
 * Authorization: does the authenticated user hold one of the allowed roles?
 * Used as `requireRole('STAFF', 'ADMIN')` on every desk-side route.
 */
export function requireRole(...allowed: RoleName[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(ApiError.forbidden('This area is restricted to ' + allowed.join(' and ') + ' accounts.'));
      return;
    }
    next();
  };
}

/** Reads the token when present but does not demand one (used by public lists). */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const payload = verifyToken(header.slice(7).trim());
    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: payload.name,
    };
  } catch {
    // An invalid token on an optional route is simply ignored.
  }
  next();
};
