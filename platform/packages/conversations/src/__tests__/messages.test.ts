import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createTestDb, type TestDb } from './helpers.js';
import { createMessage, getMessageById, listMessages, searchMessages } from '../data/messages.js';
import { messageRoutes } from '../routes/messages.js';
import { CreateMessageInput, ListMessagesInput, SearchMessagesInput } from '../types/messages.js';

const CONV_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const SENDER_ID = '99999999-9999-9999-9999-999999999999';

// ── Zod schema validation ──

describe('Message Types', () => {
  it('validates CreateMessageInput', () => {
    const valid = CreateMessageInput.safeParse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Hello',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects empty body', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects whitespace-only body', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: '   ',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: 'not-a-uuid',
      senderId: SENDER_ID,
      body: 'Hello',
    });
    expect(invalid.success).toBe(false);
  });

  it('defaults type to text and visibility to public', () => {
    const result = CreateMessageInput.parse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Hello',
    });
    expect(result.type).toBe('text');
    expect(result.visibility).toBe('public');
  });

  it('accepts internal visibility for notes', () => {
    const result = CreateMessageInput.parse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Internal note',
      visibility: 'internal',
    });
    expect(result.visibility).toBe('internal');
  });

  it('validates ListMessagesInput with defaults', () => {
    const result = ListMessagesInput.parse({ conversationId: CONV_ID });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('rejects limit over 100', () => {
    const invalid = ListMessagesInput.safeParse({
      conversationId: CONV_ID,
      limit: 200,
    });
    expect(invalid.success).toBe(false);
  });

  it('validates SearchMessagesInput', () => {
    const valid = SearchMessagesInput.safeParse({ query: 'hello' });
    expect(valid.success).toBe(true);
  });

  it('rejects empty search query', () => {
    const invalid = SearchMessagesInput.safeParse({ query: '' });
    expect(invalid.success).toBe(false);
  });

  it('accepts attachments with valid structure', () => {
    const result = CreateMessageInput.parse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'See attached',
      attachments: [{
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        contentType: 'application/pdf',
        size: 1024,
      }],
    });
    expect(result.attachments).toHaveLength(1);
  });

  it('rejects attachment with invalid url', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'See attached',
      attachments: [{ url: 'not-a-url', filename: 'f', contentType: 'text/plain', size: 1 }],
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects attachment with non-positive size', () => {
    const invalid = CreateMessageInput.safeParse({
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'See attached',
      attachments: [{ url: 'https://example.com/f', filename: 'f', contentType: 'text/plain', size: 0 }],
    });
    expect(invalid.success).toBe(false);
  });
});

// ── Data layer tests (in-memory adapter) ──

describe('messages data layer', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a message with defaults', async () => {
    const msg = await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Hello',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    expect(msg.id).toBeDefined();
    expect(msg.conversationId).toBe(CONV_ID);
    expect(msg.senderId).toBe(SENDER_ID);
    expect(msg.body).toBe('Hello');
    expect(msg.type).toBe('text');
    expect(msg.visibility).toBe('public');
    expect(msg.createdAt).toBeInstanceOf(Date);
    expect(msg.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects whitespace-only body at data layer', async () => {
    await expect(
      createMessage(db, {
        conversationId: CONV_ID,
        senderId: SENDER_ID,
        body: '   ',
        type: 'text',
        visibility: 'public',
        metadata: {},
        attachments: [],
      }),
    ).rejects.toThrow('empty or whitespace');
  });

  it('retrieves a message by ID', async () => {
    const created = await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Find me',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    const found = await getMessageById(db, created.id);
    expect(found).toBeDefined();
    expect(found!.body).toBe('Find me');
  });

  it('returns undefined for unknown message ID', async () => {
    const found = await getMessageById(db, 'nonexistent');
    expect(found).toBeUndefined();
  });

  it('lists messages for a conversation', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'First',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Second',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    await createMessage(db, {
      conversationId: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
      senderId: SENDER_ID,
      body: 'Other conv',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });

    const msgs = await listMessages(db, { conversationId: CONV_ID, limit: 50, offset: 0 });
    expect(msgs).toHaveLength(2);
  });

  it('filters messages by visibility', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Public msg',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Internal note',
      type: 'text',
      visibility: 'internal',
      metadata: {},
      attachments: [],
    });

    const internal = await listMessages(db, {
      conversationId: CONV_ID,
      visibility: 'internal',
      limit: 50,
      offset: 0,
    });
    expect(internal).toHaveLength(1);
    expect(internal[0]!.body).toBe('Internal note');
  });

  it('paginates messages with limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      await createMessage(db, {
        conversationId: CONV_ID,
        senderId: SENDER_ID,
        body: `Message ${i}`,
        type: 'text',
        visibility: 'public',
        metadata: {},
        attachments: [],
      });
    }

    const page = await listMessages(db, { conversationId: CONV_ID, limit: 2, offset: 1 });
    expect(page).toHaveLength(2);
  });

  it('searches messages by body text', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Hello world',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Goodbye',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });

    const results = await searchMessages(db, { query: 'hello', limit: 20, offset: 0 });
    expect(results).toHaveLength(1);
    expect(results[0]!.body).toBe('Hello world');
  });

  it('search returns empty for whitespace-only query', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Hello',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });

    const results = await searchMessages(db, { query: '   ', limit: 20, offset: 0 });
    expect(results).toEqual([]);
  });

  it('search is case-insensitive', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'URGENT: Please help',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });

    const results = await searchMessages(db, { query: 'urgent', limit: 20, offset: 0 });
    expect(results).toHaveLength(1);
  });

  it('preserves metadata and attachments', async () => {
    const msg = await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'With extras',
      type: 'text',
      visibility: 'public',
      metadata: { source: 'email', priority: 'high' },
      attachments: [{
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
        contentType: 'application/pdf',
        size: 2048,
      }],
    });

    expect(msg.metadata).toEqual({ source: 'email', priority: 'high' });
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0]!.filename).toBe('file.pdf');
  });
});

// ── Route tests (integration with in-memory adapter) ──

describe('Message Routes', () => {
  let db: TestDb;
  let app: Hono;

  let seededConvId: string;

  beforeEach(async () => {
    db = createTestDb();
    // Seed a conversation so message creation can verify it exists
    const conv = await db.conversationCrud.create({
      channelOrigin: 'email',
      subject: 'Test conversation',
    });
    seededConvId = conv.id;

    app = new Hono();
    app.use('*', async (c, next) => {
      c.set('db', db as any);
      c.set('actorId', SENDER_ID);
      await next();
    });
    app.route('/', messageRoutes);
  });

  it('GET /conversations/:id/messages returns messages', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Hello',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });

    const res = await app.request(`/conversations/${CONV_ID}/messages`);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: unknown[] };
    expect(json.data).toHaveLength(1);
  });

  it('POST /conversations/:id/messages creates a message', async () => {
    const res = await app.request(`/conversations/${seededConvId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'New message' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { body: string } };
    expect(json.data.body).toBe('New message');
  });

  it('POST rejects empty body', async () => {
    const res = await app.request(`/conversations/${CONV_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST rejects whitespace-only body', async () => {
    const res = await app.request(`/conversations/${CONV_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /messages/search returns results', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Searchable content',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });

    const res = await app.request('/messages/search?query=searchable');
    expect(res.status).toBe(200);
    const json = await res.json() as { data: unknown[] };
    expect(json.data).toHaveLength(1);
  });

  it('GET /messages/search rejects empty query', async () => {
    const res = await app.request('/messages/search?query=');
    expect(res.status).toBe(400);
  });

  it('GET /messages/:id returns a message', async () => {
    const msg = await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Find me',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    const res = await app.request(`/messages/${msg.id}`);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { id: string } };
    expect(json.data.id).toBe(msg.id);
  });

  it('GET /messages/:id returns 404 for unknown', async () => {
    const res = await app.request('/messages/nonexistent');
    expect(res.status).toBe(404);
  });

  it('GET /conversations/:id/messages filters by visibility', async () => {
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Public',
      type: 'text',
      visibility: 'public',
      metadata: {},
      attachments: [],
    });
    await createMessage(db, {
      conversationId: CONV_ID,
      senderId: SENDER_ID,
      body: 'Internal',
      type: 'text',
      visibility: 'internal',
      metadata: {},
      attachments: [],
    });

    const res = await app.request(`/conversations/${CONV_ID}/messages?visibility=internal`);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ body: string }> };
    expect(json.data).toHaveLength(1);
    expect(json.data[0]!.body).toBe('Internal');
  });

  it('GET /conversations/:id/messages handles non-numeric limit gracefully', async () => {
    const res = await app.request(`/conversations/${CONV_ID}/messages?limit=abc`);
    expect(res.status).toBe(200);
  });
});
