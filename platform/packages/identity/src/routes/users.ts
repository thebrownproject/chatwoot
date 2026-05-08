import { randomBytes, scryptSync } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserDb } from '../data/users.js';
import {
  createUser,
  getUserById,
  listUsers,
  updateUser,
} from '../data/users.js';
import type { User, UserType } from '../types.js';

/**
 * Strip sensitive fields before returning a user in API responses.
 */
export function sanitizeUser(user: User): Omit<User, 'api_key_hash' | 'clerk_id'> {
  const { api_key_hash: _, clerk_id: __, ...safe } = user;
  return safe;
}

const userCreateSchema = z.object({
  type: z.enum(['human_agent', 'ai_agent', 'contact', 'system']),
  name: z.string().min(1),
  email: z.string().email().nullish(),
  avatar_url: z.string().url().nullish(),
  metadata: z.record(z.unknown()).nullish(),
});

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullish(),
  avatar_url: z.string().url().nullish(),
  metadata: z.record(z.unknown()).nullish(),
});

const userTypeEnum = z.enum(['human_agent', 'ai_agent', 'contact', 'system']);

/**
 * Create user routes.
 * Expects a UserDb dependency to be provided at mount time.
 */
export function createUserRoutes(db: UserDb) {
  const app = new Hono();

  // GET /users — list users (query params: type, limit, offset)
  app.get('/', async (c) => {
    const typeParam = c.req.query('type');
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');

    let type: UserType | undefined;
    if (typeParam) {
      const parsed = userTypeEnum.safeParse(typeParam);
      if (!parsed.success) {
        return c.json({ error: 'Invalid type parameter' }, 400);
      }
      type = parsed.data;
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    if (limitParam && (isNaN(limit!) || limit! < 0)) {
      return c.json({ error: 'Invalid limit parameter' }, 400);
    }
    if (offsetParam && (isNaN(offset!) || offset! < 0)) {
      return c.json({ error: 'Invalid offset parameter' }, 400);
    }

    const users = await listUsers(db, { type, limit, offset });
    return c.json({ data: users.map(sanitizeUser) });
  });

  // GET /users/:id — get user by ID
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(db, id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ data: sanitizeUser(user) });
  });

  // POST /users — create user
  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        400,
      );
    }
    const user = await createUser(db, parsed.data);
    return c.json({ data: sanitizeUser(user) }, 201);
  });

  // PATCH /users/:id — update user
  app.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        400,
      );
    }
    const user = await updateUser(db, id, parsed.data);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ data: sanitizeUser(user) });
  });

  // POST /users/:id/api-key — generate a new API key for a user
  app.post('/:id/api-key', async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(db, id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Generate a cryptographically random API key
    const rawKey = `bp_${randomBytes(32).toString('hex')}`;

    // Hash with scrypt (KDF) before storing
    const salt = randomBytes(16);
    const derived = scryptSync(rawKey, salt, 64);
    const hash = `${salt.toString('hex')}:${derived.toString('hex')}`;

    // Store the hash on the user record
    // api_key_hash is intentionally excluded from UserUpdate — use direct DB write
    await db.update(id, { api_key_hash: hash } as any);

    // Return raw key once — it cannot be retrieved again
    return c.json({ data: { api_key: rawKey } }, 201);
  });

  return app;
}
