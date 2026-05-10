import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { labelRoutes } from '../routes/labels.js';
import { createLabel, listLabels, addLabelToConversation, removeLabelFromConversation, getConversationLabels, getConversationsByLabel } from '../data/labels.js';
import { CreateLabelInput } from '../types/labels.js';
import { createTestDb, type TestDb } from './helpers.js';

const conversationId = '660e8400-e29b-41d4-a716-446655440001';
const labelId = '550e8400-e29b-41d4-a716-446655440010';

describe('Label Types', () => {
  it('validates CreateLabelInput', () => {
    const valid = CreateLabelInput.safeParse({ name: 'billing', color: '#ff0000' });
    expect(valid.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = CreateLabelInput.safeParse({ name: '' });
    expect(invalid.success).toBe(false);
  });

  it('rejects whitespace-only name', () => {
    const invalid = CreateLabelInput.safeParse({ name: '   ' });
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

describe('Label Data Layer', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a label', async () => {
    const label = await createLabel(db, { name: 'billing', color: '#ff0000' });
    expect(label.name).toBe('billing');
    expect(label.color).toBe('#ff0000');
    expect(label.id).toBeDefined();
  });

  it('creates a label with null color', async () => {
    const label = await createLabel(db, { name: 'support' });
    expect(label.color).toBeNull();
  });

  it('deduplicates labels by name (returns existing)', async () => {
    const first = await createLabel(db, { name: 'billing', color: '#ff0000' });
    const second = await createLabel(db, { name: 'billing', color: '#00ff00' });
    expect(second.id).toBe(first.id);
    expect(second.color).toBe('#ff0000');
  });

  it('trims label names before creating', async () => {
    const label = await createLabel(db, { name: '  billing  ' });
    expect(label.name).toBe('billing');
  });

  it('throws on whitespace-only name', async () => {
    await expect(createLabel(db, { name: '   ' })).rejects.toThrow('Label name cannot be empty');
  });

  it('lists labels sorted by name', async () => {
    await createLabel(db, { name: 'zebra' });
    await createLabel(db, { name: 'alpha' });
    const labels = await listLabels(db);
    expect(labels[0].name).toBe('alpha');
    expect(labels[1].name).toBe('zebra');
  });

  it('adds label to conversation', async () => {
    const label = await createLabel(db, { name: 'urgent' });
    const cl = await addLabelToConversation(db, { conversationId, labelId: label.id });
    expect(cl.conversationId).toBe(conversationId);
    expect(cl.labelId).toBe(label.id);
  });

  it('adding same label to same conversation is idempotent', async () => {
    const label = await createLabel(db, { name: 'urgent' });
    await addLabelToConversation(db, { conversationId, labelId: label.id });
    const second = await addLabelToConversation(db, { conversationId, labelId: label.id });
    expect(second.conversationId).toBe(conversationId);
    const labels = await getConversationLabels(db, conversationId);
    expect(labels).toHaveLength(1);
  });

  it('removes label from conversation', async () => {
    const label = await createLabel(db, { name: 'urgent' });
    await addLabelToConversation(db, { conversationId, labelId: label.id });
    await removeLabelFromConversation(db, { conversationId, labelId: label.id });
    const labels = await getConversationLabels(db, conversationId);
    expect(labels).toHaveLength(0);
  });

  it('gets conversation labels', async () => {
    const l1 = await createLabel(db, { name: 'billing' });
    const l2 = await createLabel(db, { name: 'urgent' });
    await addLabelToConversation(db, { conversationId, labelId: l1.id });
    await addLabelToConversation(db, { conversationId, labelId: l2.id });
    const labels = await getConversationLabels(db, conversationId);
    expect(labels).toHaveLength(2);
  });

  it('gets conversations by label', async () => {
    const label = await createLabel(db, { name: 'billing' });
    const conv1 = '660e8400-e29b-41d4-a716-446655440001';
    const conv2 = '660e8400-e29b-41d4-a716-446655440002';
    await addLabelToConversation(db, { conversationId: conv1, labelId: label.id });
    await addLabelToConversation(db, { conversationId: conv2, labelId: label.id });
    const convIds = await getConversationsByLabel(db, label.id);
    expect(convIds).toHaveLength(2);
    expect(convIds).toContain(conv1);
    expect(convIds).toContain(conv2);
  });

  it('returns empty array for conversation with no labels', async () => {
    const labels = await getConversationLabels(db, 'nonexistent');
    expect(labels).toHaveLength(0);
  });

  it('returns empty array for label with no conversations', async () => {
    const convIds = await getConversationsByLabel(db, 'nonexistent');
    expect(convIds).toHaveLength(0);
  });
});

describe('Label Routes', () => {
  let db: TestDb;
  let app: Hono;

  beforeEach(() => {
    db = createTestDb();
    app = new Hono();
    app.use('*', async (c, next) => {
      c.set('db', db);
      await next();
    });
    app.route('/', labelRoutes);
  });

  it('GET /labels returns all labels', async () => {
    await createLabel(db, { name: 'billing' });
    const res = await app.request('/labels');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe('billing');
  });

  it('POST /labels creates a label', async () => {
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

  it('POST /labels rejects whitespace-only name', async () => {
    const res = await app.request('/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /conversations/:id/labels returns conversation labels', async () => {
    const label = await createLabel(db, { name: 'billing' });
    await addLabelToConversation(db, { conversationId, labelId: label.id });

    const res = await app.request(`/conversations/${conversationId}/labels`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('POST /conversations/:id/labels adds a label', async () => {
    const label = await createLabel(db, { name: 'billing' });

    const res = await app.request(`/conversations/${conversationId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labelId: label.id }),
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
    const label = await createLabel(db, { name: 'billing' });
    await addLabelToConversation(db, { conversationId, labelId: label.id });

    const res = await app.request(
      `/conversations/${conversationId}/labels/${label.id}`,
      { method: 'DELETE' },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
