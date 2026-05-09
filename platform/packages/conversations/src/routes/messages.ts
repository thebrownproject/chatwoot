import { Hono } from 'hono';
import { CreateMessageInput, ListMessagesInput, SearchMessagesInput } from '../types/messages.js';
import { createMessage, getMessageById, listMessages, searchMessages } from '../data/messages.js';
import type { RouteEnv } from './shared.js';
import { numParam } from './shared.js';

export const messageRoutes = new Hono<RouteEnv>();

function foreignKeyConstraint(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err) || (err as { code?: string }).code !== '23503') {
    return undefined;
  }

  const error = err as {
    constraint_name?: string;
    constraint?: string;
    message?: string;
  };
  return error.constraint_name ?? error.constraint ?? error.message;
}

messageRoutes.get('/conversations/:id/messages', async (c) => {
  const db = c.get('db');

  const parsed = ListMessagesInput.safeParse({
    conversationId: c.req.param('id'),
    visibility: c.req.query('visibility'),
    limit: numParam(c, 'limit'),
    offset: numParam(c, 'offset'),
  });

  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
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
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  try {
    const message = await createMessage(db, parsed.data);
    return c.json({ data: message }, 201);
  } catch (err) {
    const constraint = foreignKeyConstraint(err);
    if (constraint?.includes('conversation_id')) {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    if (constraint?.includes('sender_id')) {
      return c.json({ error: 'Sender not found' }, 404);
    }

    throw err;
  }
});

messageRoutes.get('/messages/search', async (c) => {
  const db = c.get('db');

  const parsed = SearchMessagesInput.safeParse({
    query: c.req.query('query') ?? '',
    limit: numParam(c, 'limit'),
    offset: numParam(c, 'offset'),
  });

  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
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
