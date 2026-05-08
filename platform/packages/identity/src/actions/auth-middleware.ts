import { timingSafeEqual, scryptSync } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { User, AuthContext } from '../types.js';
import type { UserDb } from '../data/users.js';

/**
 * Dependencies injected into the auth middleware.
 * Keeps the middleware testable — no global imports.
 */
export interface AuthMiddlewareDeps {
  userDb: UserDb;
  /** Verify a Clerk JWT. Returns the Clerk user ID (sub claim) or throws. */
  verifyClerkToken: (token: string) => Promise<string>;
  /**
   * Hash an API key for lookup purposes (e.g. first 8 bytes of scrypt output).
   * The full verification is done via timing-safe comparison after lookup.
   */
  hashApiKey: (key: string) => string;
}

/**
 * Hono variables set by auth middleware.
 * Access via `c.get('auth')` in route handlers.
 */
export interface AuthEnv {
  Variables: {
    auth: AuthContext;
  };
}

/**
 * Create auth middleware for Hono.
 *
 * Checks for:
 * 1. `Authorization: Bearer <token>` — Clerk JWT verification
 * 2. `X-API-Key: <key>` — API key for agent auth
 *
 * Attaches authenticated user to context as `c.get('auth')`.
 */
export function createAuthMiddleware(deps: AuthMiddlewareDeps) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const apiKeyHeader = c.req.header('X-API-Key');

    // Try Bearer token (Clerk JWT)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      let clerkUserId: string;
      try {
        clerkUserId = await deps.verifyClerkToken(token);
      } catch {
        return c.json({ error: 'Invalid or expired token' }, 401);
      }

      const user = await deps.userDb.findByClerkId(clerkUserId);
      if (!user) {
        return c.json({ error: 'User not found for Clerk ID' }, 401);
      }

      c.set('auth', { user, method: 'clerk' } satisfies AuthContext);
      return next();
    }

    // Try API key
    if (apiKeyHeader) {
      const hash = deps.hashApiKey(apiKeyHeader);
      const user = await deps.userDb.findByApiKeyHash(hash);
      if (!user || !user.api_key_hash) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      // Timing-safe verification: re-derive scrypt hash and compare
      if (!verifyApiKey(apiKeyHeader, user.api_key_hash)) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      c.set('auth', { user, method: 'api_key' } satisfies AuthContext);
      return next();
    }

    return c.json({ error: 'Missing authentication' }, 401);
  });
}

/**
 * Verify an API key against a stored scrypt hash using timing-safe comparison.
 * Hash format: `<hex-salt>:<hex-derived-key>`
 */
function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const salt = Buffer.from(parts[0], 'hex');
  const storedDerived = Buffer.from(parts[1], 'hex');

  let derived: Buffer;
  try {
    derived = scryptSync(rawKey, salt, storedDerived.length);
  } catch {
    return false;
  }

  if (derived.length !== storedDerived.length) return false;
  return timingSafeEqual(derived, storedDerived);
}
