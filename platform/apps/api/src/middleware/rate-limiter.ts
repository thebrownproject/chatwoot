/**
 * In-memory rate limiter middleware.
 *
 * 100 requests per minute per IP in production. Uses a sliding window approach with
 * per-IP request timestamps. Production should use Redis for cross-process
 * consistency.
 */

import type { MiddlewareHandler } from 'hono';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = process.env.NODE_ENV === 'production' ? 100 : 1_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? DEFAULT_MAX_REQUESTS);
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';

/** Prune entries older than the window. Called periodically to prevent memory leaks. */
function prune(): void {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// Prune every 60 seconds
setInterval(prune, 60_000).unref();

export const rateLimiter: MiddlewareHandler = async (c, next) => {
  if (RATE_LIMIT_DISABLED) {
    await next();
    return;
  }

  // Extract IP from headers (Fly.io, Cloudflare, etc.) or fall back to 'unknown'
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown';

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.timestamps[0]! + WINDOW_MS - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    c.header('X-RateLimit-Limit', String(MAX_REQUESTS));
    c.header('X-RateLimit-Remaining', '0');
    return c.json(
      { error: 'Too many requests', retryAfter },
      429,
    );
  }

  entry.timestamps.push(now);

  c.header('X-RateLimit-Limit', String(MAX_REQUESTS));
  c.header('X-RateLimit-Remaining', String(MAX_REQUESTS - entry.timestamps.length));

  await next();
};

/** Reset rate limiter state. For testing only. */
export function _resetRateLimiter(): void {
  store.clear();
}
