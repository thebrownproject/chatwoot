import { describe, expect, it, vi } from 'vitest';
import { createUserRoutes } from '../routes/users.js';
import { makeUser, mockUserDb } from './helpers.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createUserRoutes', () => {
  it('stores separate lookup and verification hashes when generating an API key', async () => {
    const update = vi.fn().mockResolvedValue(makeUser({ id: VALID_UUID }));
    const db = mockUserDb({
      findById: vi.fn().mockResolvedValue(makeUser({ id: VALID_UUID, type: 'human_agent' })),
      update,
    });
    const app = createUserRoutes(db);

    const res = await app.request(`/${VALID_UUID}/api-key`, { method: 'POST' });

    expect(res.status).toBe(201);
    const body = await res.json() as { data: { api_key: string } };
    expect(body.data.api_key).toMatch(/^bp_/);
    expect(update).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({
        apiKeyHash: expect.stringMatching(/^[0-9a-f]+:[0-9a-f]+$/),
        apiKeyLookupHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });

  it('rejects API key generation for contact users', async () => {
    const db = mockUserDb({
      findById: vi.fn().mockResolvedValue(makeUser({ id: VALID_UUID, type: 'contact' })),
    });
    const app = createUserRoutes(db);

    const res = await app.request(`/${VALID_UUID}/api-key`, { method: 'POST' });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('agent users');
  });

  it('rejects API key generation for system users', async () => {
    const db = mockUserDb({
      findById: vi.fn().mockResolvedValue(makeUser({ id: VALID_UUID, type: 'system' })),
    });
    const app = createUserRoutes(db);

    const res = await app.request(`/${VALID_UUID}/api-key`, { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('rejects invalid UUID on GET /:id', async () => {
    const db = mockUserDb();
    const app = createUserRoutes(db);

    const res = await app.request('/not-a-uuid', { method: 'GET' });
    expect(res.status).toBe(400);
    expect(db.findById).not.toHaveBeenCalled();
  });

  it('rejects invalid UUID on PATCH /:id', async () => {
    const db = mockUserDb();
    const app = createUserRoutes(db);

    const res = await app.request('/not-a-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects whitespace-only name on POST /users', async () => {
    const db = mockUserDb();
    const app = createUserRoutes(db);

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'human_agent', name: '   ' }),
    });
    expect(res.status).toBe(400);
  });
});
