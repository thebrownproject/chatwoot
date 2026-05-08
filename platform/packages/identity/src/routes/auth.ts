import { Hono } from 'hono';
import { z } from 'zod';
import type { UserDb } from '../data/users.js';

export interface AuthRouteDeps {
  userDb: UserDb;
  /** Verify a Clerk JWT. Returns the Clerk user ID (sub claim) or throws. */
  verifyClerkToken: (token: string) => Promise<string>;
  /** Hash an API key for comparison against stored hashes. */
  hashApiKey: (key: string) => string;
}

const verifySchema = z.object({
  token: z.string().min(1),
});

const apiKeySchema = z.object({
  api_key: z.string().min(1),
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
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const user = await deps.userDb.findByClerkId(clerkUserId);
    if (!user) {
      return c.json({ error: 'User not found for Clerk ID' }, 404);
    }

    return c.json({ data: user });
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
    if (!user) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    return c.json({ data: user });
  });

  return app;
}
