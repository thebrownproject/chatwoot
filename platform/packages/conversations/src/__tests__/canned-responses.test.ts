import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { cannedResponseRoutes } from '../routes/canned-responses.js';
import {
  createCannedResponse,
  getCannedResponseById,
  listCannedResponses,
  updateCannedResponse,
  deleteCannedResponse,
  searchCannedResponses,
} from '../data/canned-responses.js';
import {
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  SearchCannedResponsesInput,
} from '../types/canned-responses.js';
import { createTestDb, type TestDb } from './helpers.js';

const createdBy = '770e8400-e29b-41d4-a716-446655440002';

describe('Canned Response Types', () => {
  it('validates CreateCannedResponseInput', () => {
    const valid = CreateCannedResponseInput.safeParse({
      title: 'greeting',
      body: 'Hello!',
      createdBy,
    });
    expect(valid.success).toBe(true);
  });

  it('rejects empty title', () => {
    const invalid = CreateCannedResponseInput.safeParse({
      title: '',
      body: 'Hello!',
      createdBy,
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects whitespace-only title', () => {
    const invalid = CreateCannedResponseInput.safeParse({
      title: '   ',
      body: 'Hello!',
      createdBy,
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects empty body', () => {
    const invalid = CreateCannedResponseInput.safeParse({
      title: 'greeting',
      body: '',
      createdBy,
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects whitespace-only body', () => {
    const invalid = CreateCannedResponseInput.safeParse({
      title: 'greeting',
      body: '   ',
      createdBy,
    });
    expect(invalid.success).toBe(false);
  });

  it('validates UpdateCannedResponseInput with partial fields', () => {
    const valid = UpdateCannedResponseInput.safeParse({ title: 'updated' });
    expect(valid.success).toBe(true);
  });

  it('rejects whitespace-only update title', () => {
    const invalid = UpdateCannedResponseInput.safeParse({ title: '   ' });
    expect(invalid.success).toBe(false);
  });

  it('rejects whitespace-only update body', () => {
    const invalid = UpdateCannedResponseInput.safeParse({ body: '   ' });
    expect(invalid.success).toBe(false);
  });

  it('validates SearchCannedResponsesInput', () => {
    const valid = SearchCannedResponsesInput.safeParse({ query: 'greet' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.limit).toBe(20);
    }
  });
});

describe('Canned Response Data Layer', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a canned response', async () => {
    const cr = await createCannedResponse(db, {
      title: 'greeting',
      body: 'Hello!',
      createdBy,
    });
    expect(cr.title).toBe('greeting');
    expect(cr.body).toBe('Hello!');
    expect(cr.createdBy).toBe(createdBy);
    expect(cr.id).toBeDefined();
  });

  it('gets a canned response by id', async () => {
    const cr = await createCannedResponse(db, {
      title: 'greeting',
      body: 'Hello!',
      createdBy,
    });
    const found = await getCannedResponseById(db, cr.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('greeting');
  });

  it('returns undefined for nonexistent id', async () => {
    const found = await getCannedResponseById(db, 'nonexistent');
    expect(found).toBeUndefined();
  });

  it('lists canned responses sorted by title', async () => {
    await createCannedResponse(db, { title: 'zebra', body: 'z', createdBy });
    await createCannedResponse(db, { title: 'alpha', body: 'a', createdBy });
    const list = await listCannedResponses(db);
    expect(list[0].title).toBe('alpha');
    expect(list[1].title).toBe('zebra');
  });

  it('updates a canned response', async () => {
    const cr = await createCannedResponse(db, { title: 'old', body: 'body', createdBy });
    const updated = await updateCannedResponse(db, cr.id, { title: 'new' });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('new');
    expect(updated!.body).toBe('body');
  });

  it('returns undefined when updating nonexistent id', async () => {
    const updated = await updateCannedResponse(db, 'nonexistent', { title: 'new' });
    expect(updated).toBeUndefined();
  });

  it('rejects updating title to whitespace-only', async () => {
    const cr = await createCannedResponse(db, { title: 'valid', body: 'body', createdBy });
    await expect(updateCannedResponse(db, cr.id, { title: '   ' }))
      .rejects.toThrow('Canned response title cannot be empty');
  });

  it('rejects updating body to whitespace-only', async () => {
    const cr = await createCannedResponse(db, { title: 'valid', body: 'body', createdBy });
    await expect(updateCannedResponse(db, cr.id, { body: '   ' }))
      .rejects.toThrow('Canned response body cannot be empty');
  });

  it('deletes a canned response', async () => {
    const cr = await createCannedResponse(db, { title: 'temp', body: 'body', createdBy });
    const deleted = await deleteCannedResponse(db, cr.id);
    expect(deleted).toBe(true);
    const found = await getCannedResponseById(db, cr.id);
    expect(found).toBeUndefined();
  });

  it('returns false when deleting nonexistent id', async () => {
    const deleted = await deleteCannedResponse(db, 'nonexistent');
    expect(deleted).toBe(false);
  });

  it('searches canned responses by title', async () => {
    await createCannedResponse(db, { title: 'greeting hello', body: 'hi', createdBy });
    await createCannedResponse(db, { title: 'farewell', body: 'bye', createdBy });
    const results = await searchCannedResponses(db, { query: 'greet', limit: 20 });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('greeting hello');
  });

  it('search is case-insensitive', async () => {
    await createCannedResponse(db, { title: 'Greeting', body: 'hi', createdBy });
    const results = await searchCannedResponses(db, { query: 'greeting', limit: 20 });
    expect(results).toHaveLength(1);
  });

  it('search respects limit', async () => {
    await createCannedResponse(db, { title: 'test1', body: 'body', createdBy });
    await createCannedResponse(db, { title: 'test2', body: 'body', createdBy });
    await createCannedResponse(db, { title: 'test3', body: 'body', createdBy });
    const results = await searchCannedResponses(db, { query: 'test', limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('search returns empty for no matches', async () => {
    await createCannedResponse(db, { title: 'greeting', body: 'hi', createdBy });
    const results = await searchCannedResponses(db, { query: 'zzz', limit: 20 });
    expect(results).toHaveLength(0);
  });
});

describe('Canned Response Routes', () => {
  let db: TestDb;
  let app: Hono;

  beforeEach(() => {
    db = createTestDb();
    app = new Hono();
    app.use('*', async (c, next) => {
      c.set('db', db);
      c.set('actorId', createdBy);
      await next();
    });
    app.route('/', cannedResponseRoutes);
  });

  it('GET /canned-responses returns all responses', async () => {
    await createCannedResponse(db, { title: 'greeting', body: 'Hello!', createdBy });

    const res = await app.request('/canned-responses');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('greeting');
  });

  it('GET /canned-responses/search returns matching responses', async () => {
    await createCannedResponse(db, { title: 'greeting', body: 'Hello!', createdBy });

    const res = await app.request('/canned-responses/search?query=greet');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('GET /canned-responses/search rejects empty query', async () => {
    const res = await app.request('/canned-responses/search?query=');
    expect(res.status).toBe(400);
  });

  it('GET /canned-responses/:id returns a single response', async () => {
    const cr = await createCannedResponse(db, { title: 'greeting', body: 'Hello!', createdBy });

    const res = await app.request(`/canned-responses/${cr.id}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('greeting');
  });

  it('GET /canned-responses/:id returns 404 when not found', async () => {
    const res = await app.request('/canned-responses/550e8400-e29b-41d4-a716-446655440099');
    expect(res.status).toBe(404);
  });

  it('POST /canned-responses creates a response', async () => {
    const res = await app.request('/canned-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'greeting',
        body: 'Hello! How can I help you today?',
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe('greeting');
    expect(json.data.createdBy).toBe(createdBy);
  });

  it('POST /canned-responses rejects invalid input', async () => {
    const res = await app.request('/canned-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /canned-responses rejects whitespace-only title', async () => {
    const res = await app.request('/canned-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ', body: 'Hello!' }),
    });
    expect(res.status).toBe(400);
  });

  it('PATCH /canned-responses/:id updates a response', async () => {
    const cr = await createCannedResponse(db, { title: 'old', body: 'body', createdBy });

    const res = await app.request(`/canned-responses/${cr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'updated greeting' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('updated greeting');
  });

  it('PATCH /canned-responses/:id returns 404 when not found', async () => {
    const res = await app.request('/canned-responses/550e8400-e29b-41d4-a716-446655440099', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /canned-responses/:id rejects whitespace-only title', async () => {
    const cr = await createCannedResponse(db, { title: 'valid', body: 'body', createdBy });

    const res = await app.request(`/canned-responses/${cr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /canned-responses/:id deletes a response', async () => {
    const cr = await createCannedResponse(db, { title: 'temp', body: 'body', createdBy });

    const res = await app.request(`/canned-responses/${cr.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('DELETE /canned-responses/:id returns 404 when not found', async () => {
    const res = await app.request('/canned-responses/550e8400-e29b-41d4-a716-446655440099', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});
