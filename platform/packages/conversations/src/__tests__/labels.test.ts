import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { labelRoutes } from '../routes/labels.js';
import * as labelsData from '../data/labels.js';
import { CreateLabelInput } from '../types/labels.js';
import type { Label } from '../types/labels.js';

vi.mock('../data/labels.js', () => ({
  createLabel: vi.fn(),
  listLabels: vi.fn(),
  addLabelToConversation: vi.fn(),
  removeLabelFromConversation: vi.fn(),
  getConversationLabels: vi.fn(),
  getConversationsByLabel: vi.fn(),
}));

const mockDb = {} as any;

function createApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    await next();
  });
  app.route('/', labelRoutes);
  return app;
}

const sampleLabel: Label = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'billing',
  color: '#ff0000',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const conversationId = '660e8400-e29b-41d4-a716-446655440001';

describe('Label Types', () => {
  it('validates CreateLabelInput', () => {
    const valid = CreateLabelInput.safeParse({ name: 'billing', color: '#ff0000' });
    expect(valid.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = CreateLabelInput.safeParse({ name: '' });
    expect(invalid.success).toBe(false);
  });

  it('rejects invalid hex color', () => {
    const invalid = CreateLabelInput.safeParse({ name: 'test', color: 'red' });
    expect(invalid.success).toBe(false);
  });

  it('allows null/undefined color', () => {
    const valid = CreateLabelInput.safeParse({ name: 'test' });
    expect(valid.success).toBe(true);
  });
});

describe('Label Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('GET /labels returns all labels', async () => {
    vi.mocked(labelsData.listLabels).mockResolvedValue([sampleLabel]);

    const res = await app.request('/labels');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe('billing');
  });

  it('POST /labels creates a label', async () => {
    vi.mocked(labelsData.createLabel).mockResolvedValue(sampleLabel);

    const res = await app.request('/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'billing', color: '#ff0000' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe('billing');
  });

  it('POST /labels rejects invalid input', async () => {
    const res = await app.request('/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /conversations/:id/labels returns conversation labels', async () => {
    vi.mocked(labelsData.getConversationLabels).mockResolvedValue([sampleLabel]);

    const res = await app.request(`/conversations/${conversationId}/labels`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('POST /conversations/:id/labels adds a label', async () => {
    vi.mocked(labelsData.addLabelToConversation).mockResolvedValue({
      conversationId,
      labelId: sampleLabel.id,
    });

    const res = await app.request(`/conversations/${conversationId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelId: sampleLabel.id }),
    });
    expect(res.status).toBe(201);
  });

  it('POST /conversations/:id/labels rejects missing labelId', async () => {
    const res = await app.request(`/conversations/${conversationId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /conversations/:id/labels/:labelId removes a label', async () => {
    vi.mocked(labelsData.removeLabelFromConversation).mockResolvedValue();

    const res = await app.request(
      `/conversations/${conversationId}/labels/${sampleLabel.id}`,
      { method: 'DELETE' },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
