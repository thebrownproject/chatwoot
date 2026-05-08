/**
 * Request ID middleware.
 *
 * Assigns a UUID to each request via the X-Request-Id header.
 * If the client sends an X-Request-Id, it is preserved; otherwise
 * a new one is generated.
 *
 * Note: Hono has a built-in requestId() middleware, which is already
 * mounted in server.ts. This module exists as the explicit per-spec
 * implementation and can replace the built-in if needed.
 */

import type { MiddlewareHandler } from 'hono';

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const existing = c.req.header('x-request-id');
  const requestId = existing ?? crypto.randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();
};
