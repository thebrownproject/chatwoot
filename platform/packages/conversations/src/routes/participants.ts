import { Hono } from 'hono';
import { addParticipantSchema, updateParticipantRoleSchema } from '../types/participants.js';
import * as participants from '../data/participants.js';
import { getConversationById } from '../data/conversations.js';
import type { Db } from '../data/db.js';

export type ParticipantsEnv = { Variables: { db: Db } };

export const participantsRoutes = new Hono<ParticipantsEnv>();

function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23503'
  );
}

/** GET /conversations/:id/participants — list active participants */
participantsRoutes.get('/conversations/:id/participants', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const result = await participants.getParticipants(db, conversationId);
  return c.json({ data: result });
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

  // Verify conversation exists before adding a participant
  const conversation = await getConversationById(db, conversationId);
  if (!conversation) {
    return c.json({ error: 'Conversation or user not found' }, 404);
  }

  try {
    const participant = await participants.addParticipant(
      db,
      conversationId,
      parsed.data.userId,
      parsed.data.role,
    );
    return c.json({ data: participant }, 201);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return c.json({ error: 'Conversation or user not found' }, 404);
    }

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
    if (message.includes('Cannot remove the contact')) {
      return c.json({ error: message }, 403);
    }
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
    if (message.includes('Cannot change the role')) {
      return c.json({ error: message }, 403);
    }
    return c.json({ error: message }, 404);
  }
});
