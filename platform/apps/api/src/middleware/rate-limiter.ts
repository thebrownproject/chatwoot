/**
 * Simple in-memory rate limiter middleware for Hono.
 *
 * Tracks requests per IP in a Map with TTL-based expiry.
 * Returns 429 Too Many Requests when the limit is exceeded.
 */

import type { MiddlewareHandler } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Max requests per window. Default: 100 */
  limit?: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
}

export function rateLimiter(options: RateLimiterOptions = {}): MiddlewareHandler {
  const limit = options.limit ?? 100;
  const windowMs = options.windowMs ?? 60_000;
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries to prevent unbounded growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Allow the timer to be unreffed so it doesn't keep the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    // Set rate limit headers on every response
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: 'Too Many Requests', retryAfter },
        429,
      );
    }

    await next();
  };
}
