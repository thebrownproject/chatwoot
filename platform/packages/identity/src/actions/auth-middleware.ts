import { scryptSync, timingSafeEqual } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { User, AuthContext } from '../types.js';
import type { UserDb } from '../data/users.js';

/**
 * Verify an API key against a stored scrypt hash.
 * Hash format: `<hex-salt>:<hex-derived-key>`
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyApiKeyHash(rawKey: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, expectedHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const derived = scryptSync(rawKey, salt, expected.length);
  return timingSafeEqual(derived, expected);
}

/**
 * Dependencies injected into the auth middleware.
 * Keeps the middleware testable — no global imports.
 */
export interface AuthMiddlewareDeps {
  userDb: UserDb;
  /** Verify a Clerk JWT. Returns the Clerk user ID (sub claim) or throws. */
  verifyClerkToken: (token: string) => Promise<string>;
  /**
   * Hash an API key for lookup. Used to find the user record by hash prefix.
   * The actual verification uses timing-safe scrypt comparison.
   * @deprecated — prefer verifyApiKeyHash for new code
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
      // Look up candidate user by fast hash (for DB index lookup)
      const hash = deps.hashApiKey(apiKeyHeader);
      const user = await deps.userDb.findByApiKeyHash(hash);

      if (user?.api_key_hash) {
        // If stored hash is scrypt format (salt:derived), verify with timing-safe comparison
        if (user.api_key_hash.includes(':')) {
          if (!verifyApiKeyHash(apiKeyHeader, user.api_key_hash)) {
            return c.json({ error: 'Invalid API key' }, 401);
          }
        }
        // Legacy fast-hash format: the lookup itself is the verification
        // (will be migrated to scrypt on next key rotation)
      } else if (!user) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      c.set('auth', { user, method: 'api_key' } satisfies AuthContext);
      return next();
    }

    return c.json({ error: 'Missing authentication' }, 401);
  });
}
