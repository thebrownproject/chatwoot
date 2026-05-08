import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { messageRoutes } from '../routes/messages.js';
import * as messagesData from '../data/messages.js';
import { CreateMessageInput, ListMessagesInput, SearchMessagesInput } from '../types/messages.js';
import type { Message } from '../types/messages.js';

vi.mock('../data/messages.js', () => ({
  createMessage: vi.fn(),
  getMessageById: vi.fn(),
  listMessages: vi.fn(),
  searchMessages: vi.fn(),
}));

const mockDb = {} as any;

function createApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    await next();
  });
  app.route('/', messageRoutes);
  return app;
}

const sampleMessage: Message = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  conversationId: '660e8400-e29b-41d4-a716-446655440001',
  senderId: '770e8400-e29b-41d4-a716-446655440002',
  type: 'text',
  visibility: 'public',
  body: 'Hello, world!',
  bodyHtml: null,
  metadata: {},
  attachments: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('Message Types', () => {
  it('validates CreateMessageInput', () => {
    const valid = CreateMessageInput.safeParse({
      conversationId: '660e8400-e29b-41d4-a716-446655440001',
      senderId: '770e8400-e29b-41d4-a716-446655440002',
      body: 'Hello',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects empty body', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: '660e8400-e29b-41d4-a716-446655440001',
      senderId: '770e8400-e29b-41d4-a716-446655440002',
      body: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: 'not-a-uuid',
      senderId: '770e8400-e29b-41d4-a716-446655440002',
      body: 'Hello',
    });
    expect(invalid.success).toBe(false);
  });

  it('defaults type to text and visibility to public', () => {
    const result = CreateMessageInput.parse({
      conversationId: '660e8400-e29b-41d4-a716-446655440001',
      senderId: '770e8400-e29b-41d4-a716-446655440002',
      body: 'Hello',
    });
    expect(result.type).toBe('text');
    expect(result.visibility).toBe('public');
  });

  it('accepts internal visibility for notes', () => {
    const result = CreateMessageInput.parse({
      conversationId: '660e8400-e29b-41d4-a716-446655440001',
      senderId: '770e8400-e29b-41d4-a716-446655440002',
      body: 'Internal note',
      visibility: 'internal',
    });
    expect(result.visibility).toBe('internal');
  });

  it('validates ListMessagesInput with defaults', () => {
    const result = ListMessagesInput.parse({
      conversationId: '660e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('validates SearchMessagesInput', () => {
    const valid = SearchMessagesInput.safeParse({ query: 'hello' });
    expect(valid.success).toBe(true);
  });

  it('rejects empty search query', () => {
    const invalid = SearchMessagesInput.safeParse({ query: '' });
    expect(invalid.success).toBe(false);
  });
});

describe('Message Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('GET /conversations/:id/messages returns messages', async () => {
    vi.mocked(messagesData.listMessages).mockResolvedValue([sampleMessage]);

    const res = await app.request(
      `/conversations/${sampleMessage.conversationId}/messages`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(sampleMessage.id);
  });

  it('GET /conversations/:id/messages filters by visibility', async () => {
    vi.mocked(messagesData.listMessages).mockResolvedValue([]);

    const res = await app.request(
      `/conversations/${sampleMessage.conversationId}/messages?visibility=internal`,
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(messagesData.listMessages)).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ visibility: 'internal' }),
    );
  });

  it('POST /conversations/:id/messages creates a message', async () => {
    vi.mocked(messagesData.createMessage).mockResolvedValue(sampleMessage);

    const res = await app.request(
      `/conversations/${sampleMessage.conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: sampleMessage.senderId,
          body: 'Hello, world!',
        }),
      },
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe(sampleMessage.id);
  });

  it('POST /conversations/:id/messages rejects invalid input', async () => {
    const res = await app.request(
      `/conversations/${sampleMessage.conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '' }),
      },
    );
    expect(res.status).toBe(400);
  });

  it('GET /messages/search returns search results', async () => {
    vi.mocked(messagesData.searchMessages).mockResolvedValue([sampleMessage]);

    const res = await app.request('/messages/search?query=hello');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('GET /messages/search rejects empty query', async () => {
    const res = await app.request('/messages/search?query=');
    expect(res.status).toBe(400);
  });

  it('GET /messages/:id returns a message', async () => {
    vi.mocked(messagesData.getMessageById).mockResolvedValue(sampleMessage);
    const res = await app.request(`/messages/${sampleMessage.id}`);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { id: string } };
    expect(json.data.id).toBe(sampleMessage.id);
  });

  it('GET /messages/:id returns 404 for unknown message', async () => {
    vi.mocked(messagesData.getMessageById).mockResolvedValue(undefined as never);
    const res = await app.request('/messages/nonexistent');
    expect(res.status).toBe(404);
  });
});
