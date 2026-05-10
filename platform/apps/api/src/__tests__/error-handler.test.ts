import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  errorHandler,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../middleware/error-handler.js';

function createTestApp() {
  const app = new Hono();
  app.get('/validation', () => {
    throw new ValidationError('Invalid input');
  });
  app.get('/auth', () => {
    throw new AuthError();
  });
  app.get('/forbidden', () => {
    throw new ForbiddenError();
  });
  app.get('/not-found', () => {
    throw new NotFoundError('Resource not found');
  });
  app.get('/conflict', () => {
    throw new ConflictError('Already exists');
  });
  app.get('/unknown', () => {
    throw new Error('Something broke');
  });
  app.get('/foreign-key', () => {
    throw Object.assign(new Error('violates foreign key constraint'), { code: '23503' });
  });
  app.get('/unique-violation', () => {
    throw Object.assign(new Error('violates unique constraint'), { code: '23505' });
  });
  app.onError(errorHandler);
  return app;
}

describe('error handler', () => {
  const app = createTestApp();

  it('returns 400 for validation errors', async () => {
    const res = await app.request('/validation');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Invalid input' });
  });

  it('returns 401 for auth errors', async () => {
    const res = await app.request('/auth');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 for forbidden errors', async () => {
    const res = await app.request('/forbidden');
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'Forbidden' });
  });

  it('returns 404 for not found errors', async () => {
    const res = await app.request('/not-found');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Resource not found' });
  });

  it('returns 409 for conflict errors', async () => {
    const res = await app.request('/conflict');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: 'Already exists' });
  });

  it('returns 500 for unknown errors without leaking internals', async () => {
    const res = await app.request('/unknown');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(body)).not.toContain('Something broke');
  });

  it('returns 404 for foreign key violations without leaking database internals', async () => {
    const res = await app.request('/foreign-key');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Related record not found' });
  });

  it('returns 409 for unique constraint violations', async () => {
    const res = await app.request('/unique-violation');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: 'Record already exists' });
  });

  it('does not include status field in error response body', async () => {
    const res = await app.request('/validation');
    const body = await res.json();
    expect(body).not.toHaveProperty('status');
  });
});
