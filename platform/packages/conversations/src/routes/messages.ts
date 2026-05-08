import { Hono } from 'hono';
import { CreateMessageInput, ListMessagesInput, SearchMessagesInput } from '../types/messages.js';
import { createMessage, getMessageById, listMessages, searchMessages } from '../data/messages.js';
import type { RouteEnv } from './shared.js';
import { numParam } from './shared.js';

export const messageRoutes = new Hono<RouteEnv>();

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

  const message = await createMessage(db, parsed.data);
  return c.json({ data: message }, 201);
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
