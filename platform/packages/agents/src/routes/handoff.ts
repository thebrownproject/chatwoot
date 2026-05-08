import { Hono } from 'hono';
import { z } from 'zod';
import { requestHandoff, handoffToAgent } from '../handoff.js';
import type { DbClient } from '../types.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const requestHandoffSchema = z.object({
  reason: z.string().min(1),
  toUserId: z.string().uuid().optional(),
});

const handoffToAgentSchema = z.object({
  agentId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Route type
// ---------------------------------------------------------------------------

type Env = { Variables: { db: DbClient } };

/**
 * Handoff routes as a Hono app.
 * Mount with `app.route('/conversations', handoffRoutes)`.
 *
 * Expects a `db` variable set via middleware.
 */
export const handoffRoutes = new Hono<Env>();

// ---------------------------------------------------------------------------
// POST /conversations/:id/handoff — request handoff (agent -> human)
// ---------------------------------------------------------------------------

handoffRoutes.post('/:id/handoff', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const actorId = c.req.header('x-actor-id') ?? 'system';

  const body = await c.req.json();
  const parsed = requestHandoffSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const handoff = await requestHandoff(
    db,
    actorId,
    conversationId,
    parsed.data.reason,
    parsed.data.toUserId,
  );

  return c.json(handoff, 201);
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/handoff/agent — handoff to specific agent
// ---------------------------------------------------------------------------

handoffRoutes.post('/:id/handoff/agent', async (c) => {
  const db = c.get('db');
  const conversationId = c.req.param('id');
  const actorId = c.req.header('x-actor-id') ?? 'system';

  const body = await c.req.json();
  const parsed = handoffToAgentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  await handoffToAgent(db, conversationId, parsed.data.agentId, actorId);

  return c.json({ ok: true, conversationId, agentId: parsed.data.agentId }, 200);
});
