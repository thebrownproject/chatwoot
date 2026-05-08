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

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message, status: err.statusCode }, err.statusCode);
  }

  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error', status: 500 }, 500);
};
