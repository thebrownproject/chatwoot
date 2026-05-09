import { Hono } from 'hono';
import { z } from 'zod';
import { CreateLabelInput } from '../types/labels.js';
import {
  createLabel,
  listLabels,
  addLabelToConversation,
  removeLabelFromConversation,
  getConversationLabels,
} from '../data/labels.js';
import type { Db } from '../data/db.js';

type LabelEnv = { Variables: { db: Db } };

export const labelRoutes = new Hono<LabelEnv>();

labelRoutes.get('/labels', async (c) => {
  const db = c.get('db');
  const results = await listLabels(db);
  return c.json({ data: results });
});

labelRoutes.post('/labels', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const parsed = CreateLabelInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  const label = await createLabel(db, parsed.data);
  return c.json({ data: label }, 201);
});

labelRoutes.get('/conversations/:id/labels', async (c) => {
  const db = c.get('db');
  const results = await getConversationLabels(db, c.req.param('id'));
  return c.json({ data: results });
});

const addLabelSchema = z.object({ labelId: z.string().uuid() });

labelRoutes.post('/conversations/:id/labels', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const parsed = addLabelSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const result = await addLabelToConversation(db, {
    conversationId: c.req.param('id'),
    labelId: parsed.data.labelId,
  });
  return c.json({ data: result }, 201);
});

labelRoutes.delete('/conversations/:id/labels/:labelId', async (c) => {
  const db = c.get('db');
  await removeLabelFromConversation(db, {
    conversationId: c.req.param('id'),
    labelId: c.req.param('labelId'),
  });
  return c.json({ ok: true });
});
