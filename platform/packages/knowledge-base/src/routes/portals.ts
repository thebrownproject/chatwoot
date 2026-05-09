/**
 * Portal CRUD API routes.
 *
 * These routes require authentication. They manage portal configuration
 * for the customer-facing knowledge base.
 */

import { Hono } from 'hono';
import { z } from 'zod';

import {
  createPortal,
  getPortalById,
  listPortals,
  updatePortal,
  deletePortal,
} from '../data/portals.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createPortalSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  customDomain: z.string().max(255).nullable().optional(),
  config: z.record(z.unknown()).optional(),
});

const updatePortalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  customDomain: z.string().max(255).nullable().optional(),
  config: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createPortalRoutes(db: unknown): Hono {
  const app = new Hono();

  // GET /portals — list all portals
  app.get('/', (c) => {
    const portals = listPortals(db);
    return c.json({ data: portals });
  });

  // POST /portals — create a portal
  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createPortalSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    try {
      const portal = createPortal(db, parsed.data);
      return c.json({ data: portal }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: message }, 409);
    }
  });

  // GET /portals/:id — get a portal
  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const portal = getPortalById(db, id);
    if (!portal) {
      return c.json({ error: 'Portal not found' }, 404);
    }
    return c.json({ data: portal });
  });

  // PATCH /portals/:id — update a portal
  app.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updatePortalSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    try {
      const portal = updatePortal(db, id, parsed.data);
      if (!portal) {
        return c.json({ error: 'Portal not found' }, 404);
      }
      return c.json({ data: portal });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: message }, 409);
    }
  });

  // DELETE /portals/:id — delete a portal
  app.delete('/:id', (c) => {
    const id = c.req.param('id');
    const deleted = deletePortal(db, id);
    if (!deleted) {
      return c.json({ error: 'Portal not found' }, 404);
    }
    return c.json({ data: { deleted: true } });
  });

  return app;
}
