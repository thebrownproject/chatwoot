import { describe, it, expect } from 'vitest';
import { app } from '../server.js';

describe('GET /api/v1/health', () => {
  it('returns 200 with expected shape', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp as string).toISOString()).toBe(body.timestamp);
  });
});
