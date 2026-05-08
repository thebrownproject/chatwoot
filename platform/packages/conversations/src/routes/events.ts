import { Hono } from 'hono';
import { eventTypeSchema } from '../types/events.js';
import * as events from '../data/events.js';
import type { Db } from '../data/db.js';

export type EventsEnv = { Variables: { db: Db } };

export const eventsRoutes = new Hono<EventsEnv>();

/** GET /conversations/:id/events — list conversation events, optionally filtered by type */
eventsRoutes.get('/conversations/:id/events', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const typeParam = c.req.query('type');

  if (typeParam) {
    const parsed = eventTypeSchema.safeParse(typeParam);
    if (!parsed.success) {
      return c.json({ error: `Invalid event type: ${typeParam}` }, 400);
    }
    const result = await events.getEventsByType(db, conversationId, parsed.data);
    return c.json(result);
  }

  const result = await events.listEvents(db, conversationId);
  return c.json(result);
});
