import { Hono } from 'hono';
import { addParticipantSchema, updateParticipantRoleSchema } from '../types/participants.js';
import * as participants from '../data/participants.js';
import type { Db } from '../data/db.js';

export type ParticipantsEnv = { Variables: { db: Db } };

export const participantsRoutes = new Hono<ParticipantsEnv>();

/** GET /conversations/:id/participants — list active participants */
participantsRoutes.get('/conversations/:id/participants', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const result = await participants.getParticipants(db, conversationId);
  return c.json(result);
});

/** POST /conversations/:id/participants — add a participant */
participantsRoutes.post('/conversations/:id/participants', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const body = await c.req.json();
  const parsed = addParticipantSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  try {
    const participant = await participants.addParticipant(
      db,
      conversationId,
      parsed.data.userId,
      parsed.data.role,
    );
    return c.json(participant, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 409);
  }
});

/** DELETE /conversations/:id/participants/:userId — remove a participant */
participantsRoutes.delete('/conversations/:id/participants/:userId', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const userId = c.req.param('userId');

  try {
    await participants.removeParticipant(db, conversationId, userId);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 404);
  }
});

/** PATCH /conversations/:id/participants/:userId — update participant role */
participantsRoutes.patch('/conversations/:id/participants/:userId', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const parsed = updateParticipantRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  try {
    await participants.updateParticipantRole(db, conversationId, userId, parsed.data.role);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 404);
  }
});
