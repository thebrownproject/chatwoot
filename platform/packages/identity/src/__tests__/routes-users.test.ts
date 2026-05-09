import { describe, expect, it, vi } from 'vitest';
import { createUserRoutes } from '../routes/users.js';
import { makeUser, mockUserDb } from './helpers.js';

const VALID_UUID = '00000000-0000-0000-0000-000000000001';

describe('createUserRoutes', () => {
  it('stores separate lookup and verification hashes when generating an API key', async () => {
    const agentUser = makeUser({ id: VALID_UUID, type: 'ai_agent', name: 'Ron' });
    const update = vi.fn().mockResolvedValue(agentUser);
    const db = mockUserDb({
      findById: vi.fn().mockResolvedValue(agentUser),
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

  it('rejects API key generation for non-ai_agent users', async () => {
    const humanUser = makeUser({ id: VALID_UUID, type: 'human_agent' });
    const db = mockUserDb({
      findById: vi.fn().mockResolvedValue(humanUser),
    });
    const app = createUserRoutes(db);

    const res = await app.request(`/${VALID_UUID}/api-key`, { method: 'POST' });
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toContain('AI agent');
  });

  it('rejects non-UUID :id params', async () => {
    const db = mockUserDb();
    const app = createUserRoutes(db);

    const res = await app.request('/not-a-uuid', { method: 'GET' });
    expect(res.status).toBe(400);
    expect(db.findById).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only name on create', async () => {
    const db = mockUserDb();
    const app = createUserRoutes(db);

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'human_agent', name: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('trims name on create', async () => {
    const db = mockUserDb({
      insert: vi.fn().mockImplementation(async (data) =>
        makeUser({ ...data, id: VALID_UUID }),
      ),
    });
    const app = createUserRoutes(db);

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'human_agent', name: '  Alice  ' }),
    });
    expect(res.status).toBe(201);
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice' }),
    );
  });
});
