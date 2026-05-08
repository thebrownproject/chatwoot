/**
 * Request ID middleware for Hono.
 *
 * Generates a UUID for each request, sets it as the X-Request-ID
 * response header, and attaches it to the Hono context for
 * downstream handlers via `c.get('requestId')`.
 */

import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const id = c.req.header('x-request-id') || randomUUID();
    c.set('requestId', id);
    c.header('X-Request-ID', id);
    await next();
  };
}
