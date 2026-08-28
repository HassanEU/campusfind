import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

/** Anything that did not match a route. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`No API route matches ${req.method} ${req.originalUrl}`));
};

/**
 * PostgreSQL error codes we can translate into something a person can act on.
 * Everything else becomes a generic 500 so the database schema is never leaked.
 */
function translateDatabaseError(error: { code?: string; constraint?: string; message?: string }) {
  switch (error.code) {
    case '23505': // unique_violation
      if (error.constraint === 'users_email_key') {
        return ApiError.conflict('An account with that email already exists.');
      }
      if (error.constraint?.startsWith('uq_claim_one_pending')) {
        return ApiError.conflict('There is already a claim under review for this item.');
      }
      if (error.constraint === 'return_records_found_item_id_key') {
        return ApiError.conflict('This item has already been handed back.');
      }
      return ApiError.conflict('That record already exists.');

    case '23503': // foreign_key_violation
      return ApiError.badRequest('One of the selected values does not exist.');

    case '23514': // check_violation
      return ApiError.unprocessable('That value is not allowed by the system rules.');

    case '23502': // not_null_violation
      return ApiError.badRequest('A required field was missing.');

    default:
      return null;
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // 1. Validation failures from zod -> a field-by-field 400.
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', fields: fieldErrors },
    });
    return;
  }

  // 2. Errors we raised on purpose.
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  // 3. Expired / malformed JWT.
  if (error instanceof Error && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Your session has expired. Please sign in again.' },
    });
    return;
  }

  // 4. Known database errors.
  const translated = translateDatabaseError(error as { code?: string; constraint?: string });
  if (translated) {
    res.status(translated.statusCode).json({
      error: { code: translated.code, message: translated.message },
    });
    return;
  }

  // 5. Anything else is a bug: log it server-side, tell the client nothing.
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      ...(env.isProduction ? {} : { debug: (error as Error)?.message }),
    },
  });
};
