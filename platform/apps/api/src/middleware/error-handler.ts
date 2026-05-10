import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export class AuthError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

function isJsonParseError(err: Error): boolean {
  return err instanceof SyntaxError && /\bJSON\b/.test(err.message);
}

function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23503'
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.statusCode);
  }

  if (isJsonParseError(err)) {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  if (isForeignKeyViolation(err)) {
    return c.json({ error: 'Related record not found' }, 404);
  }

  if (isUniqueViolation(err)) {
    return c.json({ error: 'Record already exists' }, 409);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err instanceof Error ? err.message : err);
  }
  return c.json({ error: 'Internal server error' }, 500);
};
