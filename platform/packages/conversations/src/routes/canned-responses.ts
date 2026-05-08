import { Hono } from 'hono';
import {
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  SearchCannedResponsesInput,
} from '../types/canned-responses.js';
import {
  createCannedResponse,
  getCannedResponseById,
  listCannedResponses,
  updateCannedResponse,
  deleteCannedResponse,
  searchCannedResponses,
} from '../data/canned-responses.js';
import type { RouteEnv } from './shared.js';
import { numParam } from './shared.js';

export const cannedResponseRoutes = new Hono<RouteEnv>();

cannedResponseRoutes.get('/canned-responses', async (c) => {
  const db = c.get('db');
  const results = await listCannedResponses(db);
  return c.json({ data: results });
});

cannedResponseRoutes.get('/canned-responses/search', async (c) => {
  const db = c.get('db');

  const parsed = SearchCannedResponsesInput.safeParse({
    query: c.req.query('query') ?? '',
    limit: numParam(c, 'limit'),
  });

  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  const results = await searchCannedResponses(db, parsed.data);
  return c.json({ data: results });
});

cannedResponseRoutes.get('/canned-responses/:id', async (c) => {
  const db = c.get('db');
  const response = await getCannedResponseById(db, c.req.param('id'));
  if (!response) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json({ data: response });
});

cannedResponseRoutes.post('/canned-responses', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const parsed = CreateCannedResponseInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  const response = await createCannedResponse(db, parsed.data);
  return c.json({ data: response }, 201);
});

cannedResponseRoutes.patch('/canned-responses/:id', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const parsed = UpdateCannedResponseInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  const response = await updateCannedResponse(db, c.req.param('id'), parsed.data);
  if (!response) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ data: response });
});

cannedResponseRoutes.delete('/canned-responses/:id', async (c) => {
  const db = c.get('db');
  const deleted = await deleteCannedResponse(db, c.req.param('id'));
  if (!deleted) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json({ ok: true });
});
