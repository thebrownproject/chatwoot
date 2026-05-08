/**
 * Article CRUD API routes.
 *
 * Admin/agent-facing routes for managing KB articles. Includes lifecycle
 * transitions (publish, archive) and full-text search.
 */

import { Hono } from 'hono';
import { z } from 'zod';

import {
  createArticle,
  getArticleById,
  listArticlesByPortal,
  updateArticle,
  deleteArticle,
  publishArticle,
  archiveArticle,
  incrementViewCount,
  searchArticles,
} from '../data/articles.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const articleStatusSchema = z.enum(['draft', 'published', 'archived']);

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().min(1),
  contentHtml: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  authorId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().min(1).optional(),
  contentHtml: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createArticleRoutes(db: unknown): Hono {
  const app = new Hono();

  // GET /portals/:portalId/articles — list articles for a portal
  app.get('/portals/:portalId/articles', (c) => {
    const portalId = c.req.param('portalId');
    const status = c.req.query('status');
    const categoryId = c.req.query('categoryId');

    const parsedStatus = status ? articleStatusSchema.safeParse(status) : undefined;
    if (parsedStatus && !parsedStatus.success) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const articles = listArticlesByPortal(db, portalId, {
      status: parsedStatus?.data,
      categoryId: categoryId || undefined,
    });
    return c.json({ data: articles });
  });

  // POST /portals/:portalId/articles — create an article
  app.post('/portals/:portalId/articles', async (c) => {
    const portalId = c.req.param('portalId');
    const body = await c.req.json();
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const article = createArticle(db, { ...parsed.data, portalId });
    return c.json({ data: article }, 201);
  });

  // GET /articles/search — full-text search
  app.get('/articles/search', (c) => {
    const query = c.req.query('q');
    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const portalId = c.req.query('portalId');
    const status = c.req.query('status');
    const parsedStatus = status ? articleStatusSchema.safeParse(status) : undefined;

    const articles = searchArticles(db, query, {
      portalId: portalId || undefined,
      status: parsedStatus?.data,
    });
    return c.json({ data: articles });
  });

  // GET /articles/:id — get a single article (increments view count)
  app.get('/articles/:id', (c) => {
    const id = c.req.param('id');
    const article = getArticleById(db, id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }

    // Fire-and-forget view count increment
    incrementViewCount(db, id);

    return c.json({ data: article });
  });

  // PATCH /articles/:id — update an article
  app.patch('/articles/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const article = updateArticle(db, id, parsed.data);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json({ data: article });
  });

  // DELETE /articles/:id — delete an article
  app.delete('/articles/:id', (c) => {
    const id = c.req.param('id');
    const deleted = deleteArticle(db, id);
    if (!deleted) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json({ data: { deleted: true } });
  });

  // POST /articles/:id/publish — publish an article
  app.post('/articles/:id/publish', (c) => {
    const id = c.req.param('id');
    const article = publishArticle(db, id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json({ data: article });
  });

  // POST /articles/:id/archive — archive an article
  app.post('/articles/:id/archive', (c) => {
    const id = c.req.param('id');
    const article = archiveArticle(db, id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json({ data: article });
  });

  return app;
}
