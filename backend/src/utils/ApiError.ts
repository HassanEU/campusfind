/**
 * The only error type the API deliberately exposes to clients.
 *
 * Anything else that reaches the error handler is treated as a bug and reported
 * as a generic 500 — stack traces, SQL text and constraint names never leave
 * the server.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'You need to sign in to do that.') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'We could not find what you were looking for.') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new ApiError(409, message, 'CONFLICT');
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, message, 'UNPROCESSABLE', details);
  }

  static tooMany(message = 'Too many attempts. Please wait a moment and try again.') {
    return new ApiError(429, message, 'RATE_LIMITED');
  }
}
