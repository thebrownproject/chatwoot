import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { channelRoutes } from '../routes/channels.js';
import { widgetRoutes, createWidgetStore } from '../routes/widget.js';
import { createChannelDb } from '../data/channels.js';
import { registerAdapter, getAdapter, listAdapters } from '../registry.js';
import { webChatAdapter } from '../adapters/web-chat.js';
import type { ChannelDb } from '../data/channels.js';
import type { WidgetStore } from '../routes/widget.js';

describe('Channel CRUD routes', () => {
  let app: Hono;
  let db: ChannelDb;

  beforeEach(() => {
    db = createChannelDb();
    app = new Hono();
    app.route('/channels', channelRoutes(db));
  });

  it('POST /channels creates a channel', async () => {
    const res = await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_chat',
        name: 'Website Chat',
        config: { widgetColor: '#0099FF' },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe('web_chat');
    expect(body.name).toBe('Website Chat');
    expect(body.active).toBe(true);
    expect(body.id).toBeDefined();
  });

  it('POST /channels returns 400 for invalid input', async () => {
    const res = await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invalid_type' }),
    });

    expect(res.status).toBe(400);
  });

  it('GET /channels lists channels', async () => {
    // Create two channels
    await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'web_chat', name: 'Chat 1' }),
    });
    await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', name: 'Support Email' }),
    });

    const res = await app.request('/channels');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('GET /channels filters by type', async () => {
    await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'web_chat', name: 'Chat 1' }),
    });
    await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', name: 'Email 1' }),
    });

    const res = await app.request('/channels?type=web_chat');
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].type).toBe('web_chat');
  });

  it('GET /channels/:id returns a channel', async () => {
    const createRes = await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'web_chat', name: 'Chat' }),
    });
    const created = await createRes.json();

    const res = await app.request(`/channels/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it('GET /channels/:id returns 404 for missing channel', async () => {
    const res = await app.request('/channels/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PATCH /channels/:id updates a channel', async () => {
    const createRes = await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'web_chat', name: 'Chat' }),
    });
    const created = await createRes.json();

    const res = await app.request(`/channels/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Chat', active: false }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Chat');
    expect(body.active).toBe(false);
  });

  it('DELETE /channels/:id deactivates a channel', async () => {
    const createRes = await app.request('/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'web_chat', name: 'Chat' }),
    });
    const created = await createRes.json();

    const res = await app.request(`/channels/${created.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active).toBe(false);
  });
});

describe('Widget routes', () => {
  let app: Hono;
  let store: WidgetStore;

  beforeEach(() => {
    store = createWidgetStore();
    app = new Hono();
    app.route('/widget', widgetRoutes(store));
  });

  it('POST /widget/conversations creates a conversation', async () => {
    const res = await app.request('/widget/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: '00000000-0000-0000-0000-000000000001',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        initialMessage: 'Hi, I need help',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.contactName).toBe('John Doe');
    expect(body.id).toBeDefined();
  });

  it('POST /widget/conversations stores initial message', async () => {
    const createRes = await app.request('/widget/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: '00000000-0000-0000-0000-000000000001',
        contactName: 'Jane',
        initialMessage: 'Hello!',
      }),
    });
    const conv = await createRes.json();

    const res = await app.request(`/widget/conversations/${conv.id}/messages`);
    const messages = await res.json();
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('Hello!');
    expect(messages[0].senderName).toBe('Jane');
  });

  it('POST /widget/conversations/:id/messages adds a message', async () => {
    const createRes = await app.request('/widget/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: '00000000-0000-0000-0000-000000000001',
        contactName: 'Jane',
      }),
    });
    const conv = await createRes.json();

    const res = await app.request(`/widget/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Follow up question' }),
    });

    expect(res.status).toBe(201);
    const msg = await res.json();
    expect(msg.body).toBe('Follow up question');
    expect(msg.senderName).toBe('Jane');
  });

  it('GET /widget/conversations/:id/messages returns 404 for missing conversation', async () => {
    const res = await app.request('/widget/conversations/missing-id/messages');
    expect(res.status).toBe(404);
  });

  it('POST /widget/conversations returns 400 for invalid input', async () => {
    const res = await app.request('/widget/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('Channel registry', () => {
  it('registers and retrieves an adapter', () => {
    registerAdapter(webChatAdapter);
    const adapter = getAdapter('web_chat');
    expect(adapter.type).toBe('web_chat');
  });

  it('throws for unregistered adapter type', () => {
    expect(() => getAdapter('sms')).toThrow('No channel adapter registered for type: sms');
  });

  it('lists registered adapters', () => {
    registerAdapter(webChatAdapter);
    const types = listAdapters();
    expect(types).toContain('web_chat');
  });
});
