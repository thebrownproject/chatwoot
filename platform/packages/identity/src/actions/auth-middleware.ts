import { createMiddleware } from 'hono/factory';
import type { AuthContext, Capability } from '../types.js';
import type { UserDb } from '../data/users.js';
import { verifyApiKeyScrypt } from './verify-api-key.js';

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

const BEARER_RE = /^Bearer\s+/i;

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

    // Try Bearer token (Clerk JWT) — case-insensitive per RFC 7235
    if (authHeader && BEARER_RE.test(authHeader)) {
      const token = authHeader.replace(BEARER_RE, '').trim();
      if (!token) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      let clerkUserId: string;
      try {
        clerkUserId = await deps.verifyClerkToken(token);
      } catch {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      const user = await deps.userDb.findByClerkId(clerkUserId);
      if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      c.set('auth', { user, method: 'clerk' } satisfies AuthContext);
      return next();
    }

    // Try API key
    if (apiKeyHeader) {
      const trimmed = apiKeyHeader.trim();
      if (!trimmed) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      const hash = deps.hashApiKey(trimmed);
      const user = await deps.userDb.findByApiKeyHash(hash);
      if (!user || !user.apiKeyHash) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      if (!verifyApiKeyScrypt(trimmed, user.apiKeyHash)) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      c.set('auth', { user, method: 'api_key' } satisfies AuthContext);
      return next();
    }

    return c.json({ error: 'Missing authentication' }, 401);
  });
}

/**
 * Create middleware that requires a specific capability.
 * Must be used after auth middleware (expects `c.get('auth')` to be set).
 */
export function requireCapability(capability: Capability) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ error: 'Missing authentication' }, 401);
    }
    // Admin role has all capabilities implicitly
    if (auth.user.type === 'human_agent' || auth.user.type === 'ai_agent') {
      return next();
    }
    return c.json({ error: 'Forbidden' }, 403);
  });
}
