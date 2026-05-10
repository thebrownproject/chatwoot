import { describe, it, expect } from 'vitest';
import { app } from '../server.js';

describe('API integration tests', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await app.request('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({ error: 'Not found' });
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

  it('sets security headers', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('API docs endpoint lists endpoints', async () => {
    const res = await app.request('/api/v1/docs');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('endpoints');
  });

  it('API docs only advertise mounted endpoints', async () => {
    const res = await app.request('/api/v1/docs');
    const body = await res.json() as {
      endpoints: Record<string, Array<{ path: string }>>;
    };

    const advertisedPaths = Object.values(body.endpoints)
      .flat()
      .map((endpoint) => endpoint.path);

    expect(advertisedPaths).toContain('/api/v1/health');
    expect(advertisedPaths).toContain('/api/v1/docs');
    expect(advertisedPaths).toContain('/api/v1/conversations');
    expect(advertisedPaths).toContain('/api/v1/users');
  });

  it('mounts the documented module route surface', async () => {
    const checks = [
      ['/api/v1/conversations', 200],
      ['/api/v1/channels', 200],
      ['/api/v1/agents', 200],
      ['/api/v1/labels', 200],
      ['/api/v1/canned-responses', 200],
      ['/api/v1/routing-rules', 200],
      ['/api/v1/users', 200],
      ['/api/v1/conversations/unassigned', 200],
      ['/api/v1/messages/search?query=test', 200],
      ['/api/v1/canned-responses/search?query=test', 200],
    ] as const;

    for (const [path, expectedStatus] of checks) {
      const res = await app.request(path);
      expect(res.status, path).toBe(expectedStatus);
    }
  });

  it('rejects malformed UUID path parameters before hitting data stores', async () => {
    const checks = [
      ['/api/v1/conversations/not-a-uuid', { method: 'GET' }],
      ['/api/v1/conversations/not-a-uuid/messages', { method: 'GET' }],
      ['/api/v1/conversations/not-a-uuid/resolve', { method: 'POST' }],
      ['/api/v1/messages/not-a-uuid', { method: 'GET' }],
      ['/api/v1/users/not-a-uuid', { method: 'GET' }],
      ['/api/v1/teams/not-a-uuid', { method: 'GET' }],
    ] as const;

    for (const [path, init] of checks) {
      const res = await app.request(path, init);
      expect(res.status, path).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'Invalid ID parameter' });
    }
  });

  it('returns 400 for malformed JSON request bodies', async () => {
    const checks = [
      ['/api/v1/conversations', { method: 'POST' }],
      ['/api/v1/conversations/00000000-0000-4000-8000-000000000000', { method: 'PATCH' }],
      ['/api/v1/conversations/00000000-0000-4000-8000-000000000000/messages', { method: 'POST' }],
      ['/api/v1/users', { method: 'POST' }],
      ['/api/v1/channels', { method: 'POST' }],
      ['/api/v1/teams', { method: 'POST' }],
    ] as const;

    for (const [path, init] of checks) {
      const res = await app.request(path, {
        ...init,
        headers: { 'content-type': 'application/json' },
        body: '{bad json',
      });

      expect(res.status, path).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'Invalid JSON request body' });
    }
  });

  it('does not leak database errors when assigning to a missing user', async () => {
    const createWithMissingAssignee = await app.request('/api/v1/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelOrigin: 'email',
        subject: `Missing assignee on create QA ${Date.now()}`,
        assigneeId: '00000000-0000-4000-8000-000000000000',
      }),
    });
    expect(createWithMissingAssignee.status).toBe(404);
    expect(await createWithMissingAssignee.json()).toMatchObject({ error: 'Assignee not found' });

    const createRes = await app.request('/api/v1/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelOrigin: 'email',
        subject: `Missing assignee QA ${Date.now()}`,
      }),
    });
    expect(createRes.status).toBe(201);
    const conversation = await createRes.json() as { id: string };

    const assignRes = await app.request(`/api/v1/conversations/${conversation.id}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assigneeId: '00000000-0000-4000-8000-000000000000' }),
    });

    expect(assignRes.status).toBe(404);
    expect(await assignRes.json()).toMatchObject({ error: 'Assignee not found' });
  });

  it('does not leak database errors when creating messages for missing records', async () => {
    const missingConversationRes = await app.request(
      '/api/v1/conversations/00000000-0000-4000-8000-000000000000/messages',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-actor-id': '00000000-0000-4000-8000-000000000000',
        },
        body: JSON.stringify({ body: 'Message for a missing conversation', visibility: 'public' }),
      },
    );

    expect(missingConversationRes.status).toBe(404);
    expect(await missingConversationRes.json()).toMatchObject({ error: 'Conversation not found' });
  });

  it('returns domain errors for missing relational targets', async () => {
    const createConversationRes = await app.request('/api/v1/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelOrigin: 'email',
        subject: `Missing relation QA ${Date.now()}`,
      }),
    });
    expect(createConversationRes.status).toBe(201);
    const conversation = await createConversationRes.json() as { id: string };

    const addParticipantRes = await app.request(`/api/v1/conversations/${conversation.id}/participants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-4000-8000-000000000000',
        role: 'observer',
      }),
    });
    expect(addParticipantRes.status).toBe(404);
    expect(await addParticipantRes.json()).toMatchObject({ error: 'Conversation or user not found' });

    const createRoutingRuleRes = await app.request('/api/v1/routing-rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: `Missing team QA ${Date.now()}`,
        priority: 1,
        conditions: {},
        action: 'assign_team',
        targetType: 'team',
        targetId: '00000000-0000-4000-8000-000000000000',
      }),
    });
    expect(createRoutingRuleRes.status).toBe(404);
    expect(await createRoutingRuleRes.json()).toMatchObject({ error: 'Target team not found' });
  });
});
