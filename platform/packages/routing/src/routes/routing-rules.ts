import { Hono } from 'hono';
import type { RoutingDb } from '../types.js';
import { routingRuleCreateSchema, routingRuleUpdateSchema } from '../types.js';
import {
  listRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  toggleRoutingRule,
} from '../data/routing-rules.js';

type Env = { Variables: { db: RoutingDb } };

export function routingRulesRoutes(db: RoutingDb) {
  const app = new Hono<Env>();

  // Inject db into context
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });

  /** GET /routing-rules — list rules ordered by priority */
  app.get('/', async (c) => {
    const rules = await listRoutingRules(c.var.db);
    return c.json(rules);
  });

  /** POST /routing-rules — create a new rule */
  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = routingRuleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const rule = await createRoutingRule(c.var.db, parsed.data);
    return c.json(rule, 201);
  });

  /** PATCH /routing-rules/:id — update a rule */
  app.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = routingRuleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const rule = await updateRoutingRule(c.var.db, id, parsed.data);
    if (!rule) return c.json({ error: 'Not found' }, 404);
    return c.json(rule);
  });

  /** DELETE /routing-rules/:id — delete a rule */
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await deleteRoutingRule(c.var.db, id);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.body(null, 204);
  });

  /** POST /routing-rules/:id/toggle — toggle active/inactive */
  app.post('/:id/toggle', async (c) => {
    const id = c.req.param('id');
    const rule = await toggleRoutingRule(c.var.db, id);
    if (!rule) return c.json({ error: 'Not found' }, 404);
    return c.json(rule);
  });

  return app;
}
