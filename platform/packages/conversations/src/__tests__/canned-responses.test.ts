import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { cannedResponseRoutes } from '../routes/canned-responses.js';
import * as cannedData from '../data/canned-responses.js';
import {
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  SearchCannedResponsesInput,
} from '../types/canned-responses.js';
import type { CannedResponse } from '../types/canned-responses.js';

vi.mock('../data/canned-responses.js', () => ({
  createCannedResponse: vi.fn(),
  getCannedResponseById: vi.fn(),
  listCannedResponses: vi.fn(),
  updateCannedResponse: vi.fn(),
  deleteCannedResponse: vi.fn(),
  searchCannedResponses: vi.fn(),
}));

const mockDb = {} as any;

function createApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    await next();
  });
  app.route('/', cannedResponseRoutes);
  return app;
}

const sampleCannedResponse: CannedResponse = {
  id: '550e8400-e29b-41d4-a716-446655440020',
  title: 'greeting',
  body: 'Hello! How can I help you today?',
  bodyHtml: null,
  createdBy: '770e8400-e29b-41d4-a716-446655440002',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('Canned Response Types', () => {
  it('validates CreateCannedResponseInput', () => {
    const valid = CreateCannedResponseInput.safeParse({
      title: 'greeting',
      body: 'Hello!',
      createdBy: '770e8400-e29b-41d4-a716-446655440002',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects empty title', () => {
    const invalid = CreateCannedResponseInput.safeParse({
      title: '',
      body: 'Hello!',
      createdBy: '770e8400-e29b-41d4-a716-446655440002',
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects empty body', () => {
    const invalid = CreateCannedResponseInput.safeParse({
      title: 'greeting',
      body: '',
      createdBy: '770e8400-e29b-41d4-a716-446655440002',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates UpdateCannedResponseInput with partial fields', () => {
    const valid = UpdateCannedResponseInput.safeParse({ title: 'updated' });
    expect(valid.success).toBe(true);
  });

  it('validates SearchCannedResponsesInput', () => {
    const valid = SearchCannedResponsesInput.safeParse({ query: 'greet' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.limit).toBe(20);
    }
  });
});

describe('Canned Response Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('GET /canned-responses returns all responses', async () => {
    vi.mocked(cannedData.listCannedResponses).mockResolvedValue([sampleCannedResponse]);

    const res = await app.request('/canned-responses');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('greeting');
  });

  it('GET /canned-responses/search returns matching responses', async () => {
    vi.mocked(cannedData.searchCannedResponses).mockResolvedValue([sampleCannedResponse]);

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
    vi.mocked(cannedData.getCannedResponseById).mockResolvedValue(sampleCannedResponse);

    const res = await app.request(`/canned-responses/${sampleCannedResponse.id}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('greeting');
  });

  it('GET /canned-responses/:id returns 404 when not found', async () => {
    vi.mocked(cannedData.getCannedResponseById).mockResolvedValue(undefined);

    const res = await app.request('/canned-responses/550e8400-e29b-41d4-a716-446655440099');
    expect(res.status).toBe(404);
  });

  it('POST /canned-responses creates a response', async () => {
    vi.mocked(cannedData.createCannedResponse).mockResolvedValue(sampleCannedResponse);

    const res = await app.request('/canned-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'greeting',
        body: 'Hello! How can I help you today?',
        createdBy: '770e8400-e29b-41d4-a716-446655440002',
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe('greeting');
  });

  it('POST /canned-responses rejects invalid input', async () => {
    const res = await app.request('/canned-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('PATCH /canned-responses/:id updates a response', async () => {
    const updated = { ...sampleCannedResponse, title: 'updated greeting' };
    vi.mocked(cannedData.updateCannedResponse).mockResolvedValue(updated);

    const res = await app.request(`/canned-responses/${sampleCannedResponse.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'updated greeting' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('updated greeting');
  });

  it('PATCH /canned-responses/:id returns 404 when not found', async () => {
    vi.mocked(cannedData.updateCannedResponse).mockResolvedValue(undefined);

    const res = await app.request('/canned-responses/550e8400-e29b-41d4-a716-446655440099', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /canned-responses/:id deletes a response', async () => {
    vi.mocked(cannedData.deleteCannedResponse).mockResolvedValue(true);

    const res = await app.request(`/canned-responses/${sampleCannedResponse.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('DELETE /canned-responses/:id returns 404 when not found', async () => {
    vi.mocked(cannedData.deleteCannedResponse).mockResolvedValue(false);

    const res = await app.request('/canned-responses/550e8400-e29b-41d4-a716-446655440099', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});
