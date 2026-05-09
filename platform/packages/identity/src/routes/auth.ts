import { Hono } from 'hono';
import { z } from 'zod';
import type { UserDb } from '../data/users.js';
import { sanitizeUser } from '../types.js';
import { verifyApiKeyScrypt } from '../actions/verify-api-key.js';

export interface AuthRouteDeps {
  userDb: UserDb;
  /** Verify a Clerk JWT. Returns the Clerk user ID (sub claim) or throws. */
  verifyClerkToken: (token: string) => Promise<string>;
  /** Hash an API key for lookup (fast hash for DB query). Full verification uses scrypt. */
  hashApiKey: (key: string) => string;
}

const verifySchema = z.object({
  token: z.string().min(1).transform((s) => s.trim()).pipe(z.string().min(1)),
});

const apiKeySchema = z.object({
  api_key: z.string().min(1).transform((s) => s.trim()).pipe(z.string().min(1)),
});

/**
 * Create auth routes.
 * POST /auth/verify — verify Clerk JWT, return user
 * POST /auth/api-key — verify API key, return agent user
 */
export function createAuthRoutes(deps: AuthRouteDeps) {
  const app = new Hono();

  // POST /auth/verify — verify Clerk JWT, return user
  app.post('/verify', async (c) => {
    const body = await c.req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Token is required' }, 400);
    }

    let clerkUserId: string;
    try {
      clerkUserId = await deps.verifyClerkToken(parsed.data.token);
    } catch {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = await deps.userDb.findByClerkId(clerkUserId);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    return c.json({ data: sanitizeUser(user) });
  });

  // POST /auth/api-key — verify API key, return agent user
  app.post('/api-key', async (c) => {
    const body = await c.req.json();
    const parsed = apiKeySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'API key is required' }, 400);
    }

    const hash = deps.hashApiKey(parsed.data.api_key);
    const user = await deps.userDb.findByApiKeyHash(hash);
    if (!user || !user.apiKeyHash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!verifyApiKeyScrypt(parsed.data.api_key, user.apiKeyHash)) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    return c.json({ data: sanitizeUser(user) });
  });

  return app;
}
