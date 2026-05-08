import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  errorHandler,
  ValidationError,
  AuthError,
  NotFoundError,
} from '../middleware/error-handler.js';

function createTestApp() {
  const app = new Hono();
  app.get('/validation', () => {
    throw new ValidationError('Invalid input');
  });
  app.get('/auth', () => {
    throw new AuthError();
  });
  app.get('/not-found', () => {
    throw new NotFoundError('Resource not found');
  });
  app.get('/unknown', () => {
    throw new Error('Something broke');
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
    expect(body).toEqual({ error: 'Invalid input', status: 400 });
  });

  it('returns 401 for auth errors', async () => {
    const res = await app.request('/auth');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized', status: 401 });
  });

  it('returns 404 for not found errors', async () => {
    const res = await app.request('/not-found');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Resource not found', status: 404 });
  });

  it('returns 500 for unknown errors without leaking internals', async () => {
    const res = await app.request('/unknown');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error', status: 500 });
  });
});
