/**
 * Category CRUD API routes.
 *
 * Categories belong to a portal and support hierarchical nesting via
 * parentCategoryId. Position-based ordering with explicit reorder endpoint.
 */

import { Hono } from 'hono';
import { z } from 'zod';

import {
  createCategory,
  getCategoryById,
  listCategoriesByPortal,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../data/categories.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
});

const reorderSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createCategoryRoutes(db: unknown): Hono {
  const app = new Hono();

  // GET /portals/:portalId/categories — list categories for a portal
  app.get('/portals/:portalId/categories', (c) => {
    const portalId = c.req.param('portalId');
    const categories = listCategoriesByPortal(db, portalId);
    return c.json({ data: categories });
  });

  // POST /portals/:portalId/categories — create a category
  app.post('/portals/:portalId/categories', async (c) => {
    const portalId = c.req.param('portalId');
    const body = await c.req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const category = createCategory(db, { ...parsed.data, portalId });
    return c.json({ data: category }, 201);
  });

  // PATCH /categories/:id — update a category
  app.patch('/categories/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const category = updateCategory(db, id, parsed.data);
    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }
    return c.json({ data: category });
  });

  // DELETE /categories/:id — delete a category
  app.delete('/categories/:id', (c) => {
    const id = c.req.param('id');
    const deleted = deleteCategory(db, id);
    if (!deleted) {
      return c.json({ error: 'Category not found' }, 404);
    }
    return c.json({ data: { deleted: true } });
  });

  // POST /categories/reorder — reorder categories
  app.post('/categories/reorder', async (c) => {
    const body = await c.req.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    reorderCategories(db, parsed.data.positions);
    return c.json({ data: { reordered: true } });
  });

  return app;
}
