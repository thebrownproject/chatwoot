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
  unarchiveArticle,
  incrementViewCount,
  searchArticles,
} from '../data/articles.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const articleStatusSchema = z.enum(['draft', 'published', 'archived']);

const createArticleSchema = z.object({
  title: z.string().min(1).max(500).refine((s) => s.trim().length > 0, { message: 'Title cannot be whitespace-only' }),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().min(1).refine((s) => s.trim().length > 0, { message: 'Content cannot be whitespace-only' }),
  contentHtml: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  authorId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).refine((s) => s.trim().length > 0, { message: 'Title cannot be whitespace-only' }).optional(),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().min(1).refine((s) => s.trim().length > 0, { message: 'Content cannot be whitespace-only' }).optional(),
  contentHtml: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export function createArticleRoutes(db: unknown): Hono {
  const app = new Hono();

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

  app.post('/portals/:portalId/articles', async (c) => {
    const portalId = c.req.param('portalId');
    const body = await c.req.json();
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    try {
      const article = createArticle(db, { ...parsed.data, portalId });
      return c.json({ data: article }, 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

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

  app.get('/articles/:id', (c) => {
    const id = c.req.param('id');
    if (!uuidRegex.test(id)) {
      return c.json({ error: 'Invalid article ID' }, 400);
    }
    const article = getArticleById(db, id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }

    incrementViewCount(db, id);

    return c.json({ data: article });
  });

  app.patch('/articles/:id', async (c) => {
    const id = c.req.param('id');
    if (!uuidRegex.test(id)) {
      return c.json({ error: 'Invalid article ID' }, 400);
    }
    const body = await c.req.json();
    const parsed = updateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    try {
      const article = updateArticle(db, id, parsed.data);
      if (!article) {
        return c.json({ error: 'Article not found' }, 404);
      }
      return c.json({ data: article });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 409);
    }
  });

  app.delete('/articles/:id', (c) => {
    const id = c.req.param('id');
    if (!uuidRegex.test(id)) {
      return c.json({ error: 'Invalid article ID' }, 400);
    }
    const deleted = deleteArticle(db, id);
    if (!deleted) {
      return c.json({ error: 'Article not found' }, 404);
    }
    return c.json({ data: { deleted: true } });
  });

  app.post('/articles/:id/publish', (c) => {
    const id = c.req.param('id');
    if (!uuidRegex.test(id)) {
      return c.json({ error: 'Invalid article ID' }, 400);
    }
    try {
      const article = publishArticle(db, id);
      if (!article) {
        return c.json({ error: 'Article not found' }, 404);
      }
      return c.json({ data: article });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 409);
    }
  });

  app.post('/articles/:id/archive', (c) => {
    const id = c.req.param('id');
    if (!uuidRegex.test(id)) {
      return c.json({ error: 'Invalid article ID' }, 400);
    }
    try {
      const article = archiveArticle(db, id);
      if (!article) {
        return c.json({ error: 'Article not found' }, 404);
      }
      return c.json({ data: article });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 409);
    }
  });

  app.post('/articles/:id/unarchive', (c) => {
    const id = c.req.param('id');
    if (!uuidRegex.test(id)) {
      return c.json({ error: 'Invalid article ID' }, 400);
    }
    try {
      const article = unarchiveArticle(db, id);
      if (!article) {
        return c.json({ error: 'Article not found' }, 404);
      }
      return c.json({ data: article });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 409);
    }
  });

  return app;
}
