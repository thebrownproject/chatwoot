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
  /** Hash an API key for comparison against stored hashes. */
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
      if (!user) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      c.set('auth', { user, method: 'api_key' } satisfies AuthContext);
      return next();
    }

    return c.json({ error: 'Missing authentication' }, 401);
  });
}
