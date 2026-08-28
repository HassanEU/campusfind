import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Backend validation is the real gate — the browser form is only a courtesy.
 * The parsed (and coerced) result replaces the raw input so handlers work with
 * clean, typed data.
 */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Express 5 exposes req.query as a getter, so the parsed value is stashed
    // on res.locals instead of being assigned back.
    (req as unknown as { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}

/** Reads the object produced by validateQuery. */
export function getQuery<T>(req: unknown): T {
  return (req as { validatedQuery: T }).validatedQuery;
}
