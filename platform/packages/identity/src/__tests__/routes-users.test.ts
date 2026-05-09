import { describe, expect, it, vi } from 'vitest';
import { createUserRoutes } from '../routes/users.js';
import { makeUser, mockUserDb } from './helpers.js';

describe('createUserRoutes', () => {
  it('stores separate lookup and verification hashes when generating an API key', async () => {
    const update = vi.fn().mockResolvedValue(makeUser({ id: 'u-agent' }));
    const db = mockUserDb({
      findById: vi.fn().mockResolvedValue(makeUser({ id: 'u-agent' })),
      update,
    });
    const app = createUserRoutes(db);

    const res = await app.request('/u-agent/api-key', { method: 'POST' });

    expect(res.status).toBe(201);
    const body = await res.json() as { data: { api_key: string } };
    expect(body.data.api_key).toMatch(/^bp_/);
    expect(update).toHaveBeenCalledWith(
      'u-agent',
      expect.objectContaining({
        apiKeyHash: expect.stringMatching(/^[0-9a-f]+:[0-9a-f]+$/),
        apiKeyLookupHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });
});
