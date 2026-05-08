import { describe, it, expect } from 'vitest';
import { app } from '../server.js';

describe('API integration tests', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/api/v1/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns text body for 404', async () => {
    const res = await app.request('/api/v1/nonexistent');
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
  });

  it('health endpoint has correct content-type', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('sets X-Request-ID header', async () => {
    const res = await app.request('/api/v1/health');
    const requestId = res.headers.get('x-request-id');
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
  });

  it('preserves incoming X-Request-ID', async () => {
    const res = await app.request('/api/v1/health', {
      headers: { 'X-Request-ID': 'test-id-123' },
    });
    expect(res.headers.get('x-request-id')).toBe('test-id-123');
  });

  it('CORS allows configured origins', async () => {
    const res = await app.request('/api/v1/health', {
      headers: { Origin: 'http://localhost:3000' },
    });
    const acao = res.headers.get('access-control-allow-origin');
    expect(acao).toBeTruthy();
  });

  it('API docs endpoint lists endpoints', async () => {
    const res = await app.request('/api/v1/docs');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('endpoints');
  });
});
