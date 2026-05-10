import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import {
  createAuthMiddleware,
  requireCapability,
  type AuthMiddlewareDeps,
  type AuthEnv,
} from '../actions/auth-middleware.js';
import { makeUser, mockUserDb } from './helpers.js';

function createTestApp(deps: AuthMiddlewareDeps) {
  const app = new Hono<AuthEnv>();
  app.use('/*', createAuthMiddleware(deps));
  app.get('/protected', (c) => {
    const auth = c.get('auth');
    return c.json({ user: auth.user, method: auth.method });
  });
  return app;
}

describe('auth middleware', () => {
  it('returns 401 when no auth headers are present', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn(),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected');
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Missing authentication');
  });

  it('authenticates with valid Bearer token (Clerk)', async () => {
    const user = makeUser({ clerkId: 'clerk_abc' });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByClerkId: vi.fn().mockResolvedValue(user),
      }),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_abc'),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer valid-jwt-token' },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.method).toBe('clerk');
    expect(body.user.id).toBe('u-1');
  });

  it('returns 401 for invalid Bearer token', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn().mockRejectedValue(new Error('invalid')),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer bad-token' },
    });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
  });

  it('returns generic error when Clerk user not found (no info leak)', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_unknown'),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer valid-but-unknown' },
    });
    expect(res.status).toBe(401);

    const body = await res.json();
    // Must NOT reveal "User not found for Clerk ID" — that leaks user existence
    expect(body.error).toBe('Invalid credentials');
  });

  it('authenticates with valid X-API-Key', async () => {
    const { scryptSync, randomBytes } = await import('node:crypto');
    const rawKey = 'raw-api-key';
    const salt = randomBytes(16);
    const derived = scryptSync(rawKey, salt, 64);
    const scryptHash = salt.toString('hex') + ':' + derived.toString('hex');

    const agentUser = makeUser({
      id: 'u-agent',
      type: 'ai_agent',
      name: 'Ron',
      apiKeyHash: scryptHash,
    });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByApiKeyHash: vi.fn().mockResolvedValue(agentUser),
      }),
      verifyClerkToken: vi.fn(),
      hashApiKey: vi.fn().mockReturnValue('lookup-hash'),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { 'X-API-Key': rawKey },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.method).toBe('api_key');
    expect(body.user.type).toBe('ai_agent');
  });

  it('returns 401 for invalid API key', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn(),
      hashApiKey: vi.fn().mockReturnValue('bad-hash'),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { 'X-API-Key': 'wrong-key' },
    });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
  });

  it('returns 401 when stored hash is not scrypt format', async () => {
    const agentUser = makeUser({
      id: 'u-agent',
      type: 'ai_agent',
      name: 'Ron',
      apiKeyHash: 'not-a-scrypt-hash-no-colon',
    });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByApiKeyHash: vi.fn().mockResolvedValue(agentUser),
      }),
      verifyClerkToken: vi.fn(),
      hashApiKey: vi.fn().mockReturnValue('lookup-hash'),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { 'X-API-Key': 'some-key' },
    });
    expect(res.status).toBe(401);
  });

  it('prefers Bearer token over X-API-Key when both present', async () => {
    const user = makeUser({ clerkId: 'clerk_abc' });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByClerkId: vi.fn().mockResolvedValue(user),
      }),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_abc'),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: {
        Authorization: 'Bearer valid-jwt',
        'X-API-Key': 'some-key',
      },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.method).toBe('clerk');
    expect(deps.hashApiKey).not.toHaveBeenCalled();
  });

  // --- New tests ---

  it('handles case-insensitive Bearer prefix (RFC 7235)', async () => {
    const user = makeUser({ clerkId: 'clerk_abc' });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByClerkId: vi.fn().mockResolvedValue(user),
      }),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_abc'),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { Authorization: 'bearer valid-jwt-token' },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.method).toBe('clerk');
  });

  it('returns 401 for empty Bearer token', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn(),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
    expect(deps.verifyClerkToken).not.toHaveBeenCalled();
  });

  it('returns 401 for whitespace-only API key', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn(),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res = await app.request('/protected', {
      headers: { 'X-API-Key': '   ' },
    });
    expect(res.status).toBe(401);
    expect(deps.hashApiKey).not.toHaveBeenCalled();
  });

  it('uses consistent error messages (no info leaking)', async () => {
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn().mockRejectedValue(new Error('expired')),
      hashApiKey: vi.fn(),
    };
    const app = createTestApp(deps);

    const res1 = await app.request('/protected', {
      headers: { Authorization: 'Bearer expired-token' },
    });
    const body1 = await res1.json();

    // Reset for user-not-found case
    const deps2: AuthMiddlewareDeps = {
      userDb: mockUserDb(),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_unknown'),
      hashApiKey: vi.fn(),
    };
    const app2 = createTestApp(deps2);
    const res2 = await app2.request('/protected', {
      headers: { Authorization: 'Bearer valid-but-unknown' },
    });
    const body2 = await res2.json();

    // Both should return the same generic message
    expect(body1.error).toBe(body2.error);
    expect(body1.error).toBe('Invalid credentials');
  });
});

describe('requireCapability', () => {
  it('allows agent users through', async () => {
    const user = makeUser({ type: 'human_agent' });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByClerkId: vi.fn().mockResolvedValue(user),
      }),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_abc'),
      hashApiKey: vi.fn(),
    };

    const app = new Hono<AuthEnv>();
    app.use('/*', createAuthMiddleware(deps));
    app.use('/*', requireCapability('assign'));
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer jwt' },
    });
    expect(res.status).toBe(200);
  });

  it('blocks contact users', async () => {
    const user = makeUser({ type: 'contact' });
    const deps: AuthMiddlewareDeps = {
      userDb: mockUserDb({
        findByClerkId: vi.fn().mockResolvedValue(user),
      }),
      verifyClerkToken: vi.fn().mockResolvedValue('clerk_contact'),
      hashApiKey: vi.fn(),
    };

    const app = new Hono<AuthEnv>();
    app.use('/*', createAuthMiddleware(deps));
    app.use('/*', requireCapability('assign'));
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer jwt' },
    });
    expect(res.status).toBe(403);
  });
});
