import { Hono } from 'hono';

import type { ArticleRecord } from '../types.js';
import { getPortalBySlug } from '../data/portals.js';
import { listCategoriesByPortal } from '../data/categories.js';
import {
  getArticleBySlug,
  listArticlesByPortal,
  incrementViewCount,
  searchArticles,
} from '../data/articles.js';

function sanitizeArticle({ authorId, portalId, categoryId, ...rest }: ArticleRecord) {
  return rest;
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

export function createPublicRoutes(db: unknown): Hono {
  const app = new Hono();

  // GET /help/:portalSlug — get portal by slug with categories
  app.get('/:portalSlug', (c) => {
    const portalSlug = c.req.param('portalSlug');
    const portal = getPortalBySlug(db, portalSlug);
    if (!portal || !portal.active) {
      return c.json({ error: 'Portal not found' }, 404);
    }

    const categories = listCategoriesByPortal(db, portal.id);
    return c.json({ data: { ...portal, categories } });
  });

  // GET /help/:portalSlug/categories/:categorySlug — get category with published articles
  app.get('/:portalSlug/categories/:categorySlug', (c) => {
    const portalSlug = c.req.param('portalSlug');
    const categorySlug = c.req.param('categorySlug');

    const portal = getPortalBySlug(db, portalSlug);
    if (!portal || !portal.active) {
      return c.json({ error: 'Portal not found' }, 404);
    }

    const categories = listCategoriesByPortal(db, portal.id);
    const category = categories.find((cat) => cat.slug === categorySlug);
    if (!category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    const articles = listArticlesByPortal(db, portal.id, {
      status: 'published',
      categoryId: category.id,
    });

    return c.json({ data: { ...category, articles: articles.map(sanitizeArticle) } });
  });

  // GET /help/:portalSlug/articles/:articleSlug — get a published article
  app.get('/:portalSlug/articles/:articleSlug', (c) => {
    const portalSlug = c.req.param('portalSlug');
    const articleSlug = c.req.param('articleSlug');

    const portal = getPortalBySlug(db, portalSlug);
    if (!portal || !portal.active) {
      return c.json({ error: 'Portal not found' }, 404);
    }

    const article = getArticleBySlug(db, articleSlug);
    if (!article || article.status !== 'published' || article.portalId !== portal.id) {
      return c.json({ error: 'Article not found' }, 404);
    }

    // Fire-and-forget view count increment
    incrementViewCount(db, article.id);

    return c.json({ data: sanitizeArticle(article) });
  });

  // GET /help/:portalSlug/search — search published articles
  app.get('/:portalSlug/search', (c) => {
    const portalSlug = c.req.param('portalSlug');
    const query = c.req.query('q');

    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const portal = getPortalBySlug(db, portalSlug);
    if (!portal || !portal.active) {
      return c.json({ error: 'Portal not found' }, 404);
    }

    const articles = searchArticles(db, query, {
      portalId: portal.id,
      status: 'published',
    });

    return c.json({ data: articles.map(sanitizeArticle) });
  });

  return app;
}
