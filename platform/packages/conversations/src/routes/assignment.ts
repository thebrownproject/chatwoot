import { Hono } from 'hono';
import { assignConversationSchema, assignedConversationsFilterSchema } from '../types/assignment.js';
import * as assignment from '../data/assignment.js';
import type { Db } from '../data/db.js';

export type AssignmentEnv = { Variables: { db: Db; actorId: string } };

export const assignmentRoutes = new Hono<AssignmentEnv>();

/** POST /conversations/:id/assign — assign conversation to a user */
assignmentRoutes.post('/conversations/:id/assign', async (c) => {
  const db = c.get('db');
  const actorId = c.get('actorId');
  const conversationId = c.req.param('id');
  const body = await c.req.json();
  const parsed = assignConversationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  try {
    await assignment.assignConversation(db, conversationId, parsed.data.assigneeId, actorId);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

/** POST /conversations/:id/unassign — unassign conversation */
assignmentRoutes.post('/conversations/:id/unassign', async (c) => {
  const db = c.get('db');
  const actorId = c.get('actorId');
  const conversationId = c.req.param('id');

  try {
    await assignment.unassignConversation(db, conversationId, actorId);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

/** GET /conversations/assigned/:userId — list assigned conversations */
assignmentRoutes.get('/conversations/assigned/:userId', async (c) => {
  const db = c.get('db');
  const userId = c.req.param('userId');
  const query = c.req.query();
  const parsed = assignedConversationsFilterSchema.safeParse(query);
  const filters = parsed.success ? parsed.data : {};

  const conversations = await assignment.getAssignedConversations(db, userId, filters);
  return c.json(conversations);
});

/** GET /conversations/unassigned — list unassigned conversations */
assignmentRoutes.get('/conversations/unassigned', async (c) => {
  const db = c.get('db');
  const query = c.req.query();
  const parsed = assignedConversationsFilterSchema.safeParse(query);
  const filters = parsed.success ? parsed.data : {};

  const conversations = await assignment.getUnassignedConversations(db, filters);
  return c.json(conversations);
});
