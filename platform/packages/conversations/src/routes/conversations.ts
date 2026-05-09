import { Hono } from 'hono';
import { z } from 'zod';
import {
  createConversation,
  getConversationById,
  getConversationByDisplayId,
  listConversations,
  updateConversation,
  resolveConversation,
  reopenConversation,
  snoozeConversation,
} from '../data/conversations.js';
import type { DbClient } from '../types.js';

// ---------------------------------------------------------------------------
// Zod schemas for request validation
// ---------------------------------------------------------------------------

const channelOriginSchema = z.enum(['email', 'web_chat', 'sms', 'slack', 'in_app']);
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const statusSchema = z.enum(['open', 'pending', 'snoozed', 'resolved']);

const createConversationSchema = z.object({
  channelOrigin: channelOriginSchema,
  subject: z.string().optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateConversationSchema = z.object({
  subject: z.string().optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const snoozeSchema = z.object({
  until: z.string().datetime(),
});

const listFiltersSchema = z.object({
  status: statusSchema.optional(),
  assigneeId: z.string().uuid().optional(),
  channelOrigin: channelOriginSchema.optional(),
  priority: prioritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Route type — expects `db` in Hono env variables
// ---------------------------------------------------------------------------

type Env = { Variables: { db: DbClient; actorId: string } };

/**
 * Conversation routes as a Hono app.
 * Mount with `app.route('/conversations', conversationRoutes)`.
 *
 * Expects a `db` variable set via middleware (e.g. `c.set('db', dbClient)`).
 */
export const conversationRoutes = new Hono<Env>();

// ---------------------------------------------------------------------------
// GET /conversations — list with query filters
// ---------------------------------------------------------------------------

conversationRoutes.get('/', async (c) => {
  const db = c.get('db');
  const parsed = listFiltersSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));

  if (!parsed.success) {
    return c.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, 400);
  }

  const result = await listConversations(db, parsed.data);
  return c.json({ data: result });
});

// ---------------------------------------------------------------------------
// GET /conversations/by-number/:displayId — get by display number
// ---------------------------------------------------------------------------

conversationRoutes.get('/by-number/:displayId', async (c) => {
  const db = c.get('db');
  const displayId = Number(c.req.param('displayId'));

  if (!Number.isInteger(displayId) || displayId < 1) {
    return c.json({ error: 'Invalid display ID' }, 400);
  }

  const conversation = await getConversationByDisplayId(db, displayId);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ data: conversation });
});

// ---------------------------------------------------------------------------
// GET /conversations/:id — get by UUID
// ---------------------------------------------------------------------------

conversationRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const conversation = await getConversationById(db, id);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ data: conversation });
});

// ---------------------------------------------------------------------------
// POST /conversations — create new conversation
// ---------------------------------------------------------------------------

conversationRoutes.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const parsed = createConversationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const actorId = c.get('actorId') ?? 'system';
  const conversation = await createConversation(db, { ...parsed.data, actorId });
  return c.json(conversation, 201);
});

// ---------------------------------------------------------------------------
// PATCH /conversations/:id — update conversation
// ---------------------------------------------------------------------------

conversationRoutes.patch('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateConversationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const conversation = await updateConversation(db, id, parsed.data);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ data: conversation });
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/resolve — resolve conversation
// ---------------------------------------------------------------------------

conversationRoutes.post('/:id/resolve', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  // actorId would normally come from auth middleware
  const actorId = c.get('actorId') ?? 'system';

  const result = await resolveConversation(db, id, actorId);
  if (!result.ok) {
    const status = result.error === 'Conversation not found' ? 404 : 422;
    return c.json({ error: result.error }, status);
  }

  return c.json({ data: result.conversation });
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/reopen — reopen conversation
// ---------------------------------------------------------------------------

conversationRoutes.post('/:id/reopen', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const actorId = c.get('actorId') ?? 'system';

  const result = await reopenConversation(db, id, actorId);
  if (!result.ok) {
    const status = result.error === 'Conversation not found' ? 404 : 422;
    return c.json({ error: result.error }, status);
  }

  return c.json({ data: result.conversation });
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/snooze — snooze with `until` timestamp
// ---------------------------------------------------------------------------

conversationRoutes.post('/:id/snooze', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const actorId = c.get('actorId') ?? 'system';

  const body = await c.req.json();
  const parsed = snoozeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const until = new Date(parsed.data.until);
  const result = await snoozeConversation(db, id, actorId, until);
  if (!result.ok) {
    const status = result.error === 'Conversation not found' ? 404 : 422;
    return c.json({ error: result.error }, status);
  }

  return c.json({ data: result.conversation });
});
