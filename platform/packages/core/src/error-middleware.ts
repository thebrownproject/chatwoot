import type { Context, MiddlewareHandler } from 'hono';

/**
 * Smart error middleware for Hono routes.
 * Catches thrown errors and returns appropriate HTTP status codes
 * based on error message patterns, instead of generic 500.
 *
 * Mount on each module's Hono app:
 * ```ts
 * import { smartErrorHandler } from '@buildpass/core';
 * app.use('*', smartErrorHandler);
 * ```
 */
export const smartErrorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = errorToStatus(message);
    return c.json({ error: message }, status);
  }
};

function errorToStatus(message: string): 400 | 404 | 409 | 422 | 500 {
  const lower = message.toLowerCase();
  if (lower.includes('not found')) return 404;
  if (lower.includes('already exists') || lower.includes('duplicate') || lower.includes('conflict')) return 409;
  if (lower.includes('cannot') || lower.includes('invalid') || lower.includes('empty')) return 400;
  if (lower.includes('circular') || lower.includes('not allowed')) return 422;
  return 500;
}
