import { Hono } from 'hono';
import { CreateMessageInput, ListMessagesInput, SearchMessagesInput } from '../types/messages.js';
import { createMessage, getMessageById, listMessages, searchMessages } from '../data/messages.js';
import { getConversationById } from '../data/conversations.js';
import type { Db } from '../data/db.js';

type MessageRouteEnv = { Variables: { db: Db; actorId: string } };

export const messageRoutes = new Hono<MessageRouteEnv>();

function numParam(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

messageRoutes.get('/conversations/:id/messages', async (c) => {
  const db = c.get('db');

  const parsed = ListMessagesInput.safeParse({
    conversationId: c.req.param('id'),
    visibility: c.req.query('visibility'),
    limit: numParam(c.req.query('limit')),
    offset: numParam(c.req.query('offset')),
  });

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const results = await listMessages(db, parsed.data);
  return c.json({ data: results });
});

messageRoutes.post('/conversations/:id/messages', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const actorId = c.get('actorId') ?? body.senderId;
  const parsed = CreateMessageInput.safeParse({
    ...body,
    conversationId: c.req.param('id'),
    senderId: actorId,
  });

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  // Verify conversation exists before creating a message
  const conversation = await getConversationById(db, parsed.data.conversationId);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  try {
    const message = await createMessage(db, parsed.data);
    return c.json({ data: message }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('empty or whitespace')) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

messageRoutes.get('/messages/search', async (c) => {
  const db = c.get('db');

  const parsed = SearchMessagesInput.safeParse({
    query: c.req.query('query') ?? '',
    limit: numParam(c.req.query('limit')),
    offset: numParam(c.req.query('offset')),
  });

  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const results = await searchMessages(db, parsed.data);
  return c.json({ data: results });
});

messageRoutes.get('/messages/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const message = await getMessageById(db, id);
  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }
  return c.json({ data: message });
});
