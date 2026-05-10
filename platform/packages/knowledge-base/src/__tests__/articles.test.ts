import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  createArticle,
  getArticleById,
  getArticleBySlug,
  listArticlesByPortal,
  updateArticle,
  deleteArticle,
  publishArticle,
  archiveArticle,
  unarchiveArticle,
  transitionArticle,
  incrementViewCount,
  searchArticles,
  clearArticleStore,
} from '../data/articles.js';
import { createArticleRoutes } from '../routes/articles.js';
import { createPublicRoutes } from '../routes/public.js';
import { createPortal, updatePortal, clearPortalStore } from '../data/portals.js';
import { createCategory, clearCategoryStore } from '../data/categories.js';

const db = null;
const authorId = '00000000-0000-0000-0000-000000000001';

describe('Article data access', () => {
  beforeEach(() => {
    clearArticleStore();
  });

  it('creates an article as draft', () => {
    const article = createArticle(db, {
      portalId: 'p1',
      title: 'Getting Started',
      content: 'Welcome to Buildpass',
      authorId,
    });

    expect(article.id).toBeDefined();
    expect(article.title).toBe('Getting Started');
    expect(article.slug).toBe('getting-started');
    expect(article.status).toBe('draft');
    expect(article.viewCount).toBe(0);
    expect(article.position).toBe(0);
  });

  it('creates an article with explicit slug', () => {
    const article = createArticle(db, {
      portalId: 'p1',
      title: 'Getting Started',
      slug: 'custom-slug',
      content: 'Content',
      authorId,
    });
    expect(article.slug).toBe('custom-slug');
  });

  it('auto-generates slug from title', () => {
    const article = createArticle(db, {
      portalId: 'p1',
      title: 'How To Set Up Your Account!',
      content: 'Content',
      authorId,
    });
    expect(article.slug).toBe('how-to-set-up-your-account');
  });

  it('auto-increments position', () => {
    createArticle(db, { portalId: 'p1', title: 'A', content: 'a', authorId });
    const second = createArticle(db, { portalId: 'p1', title: 'B', content: 'b', authorId });
    expect(second.position).toBe(1);
  });

  it('gets article by id', () => {
    const created = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(getArticleById(db, created.id)?.title).toBe('Test');
    expect(getArticleById(db, 'nonexistent')).toBeUndefined();
  });

  it('gets article by slug', () => {
    createArticle(db, { portalId: 'p1', title: 'Test Article', content: 'c', authorId });
    expect(getArticleBySlug(db, 'test-article')?.title).toBe('Test Article');
    expect(getArticleBySlug(db, 'nonexistent')).toBeUndefined();
  });

  it('gets article by slug scoped to portal', () => {
    createArticle(db, { portalId: 'p1', title: 'Guide', content: 'c', authorId });
    createArticle(db, { portalId: 'p2', title: 'Guide', content: 'c', authorId });
    expect(getArticleBySlug(db, 'guide', 'p1')?.portalId).toBe('p1');
    expect(getArticleBySlug(db, 'guide', 'p2')?.portalId).toBe('p2');
  });

  it('lists articles by portal with filters', () => {
    const a = createArticle(db, { portalId: 'p1', title: 'A', content: 'a', authorId });
    createArticle(db, { portalId: 'p1', title: 'B', content: 'b', authorId, categoryId: 'cat1' });
    createArticle(db, { portalId: 'p2', title: 'C', content: 'c', authorId });

    publishArticle(db, a.id);

    expect(listArticlesByPortal(db, 'p1')).toHaveLength(2);
    expect(listArticlesByPortal(db, 'p1', { status: 'published' })).toHaveLength(1);
    expect(listArticlesByPortal(db, 'p1', { categoryId: 'cat1' })).toHaveLength(1);
  });

  it('updates an article', () => {
    const created = createArticle(db, { portalId: 'p1', title: 'Old', content: 'old', authorId });
    const updated = updateArticle(db, created.id, { title: 'New', content: 'new' });
    expect(updated?.title).toBe('New');
    expect(updated?.content).toBe('new');
  });

  it('returns unchanged article on empty update', () => {
    const created = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    const before = created.updatedAt;
    const updated = updateArticle(db, created.id, {});
    expect(updated?.updatedAt).toBe(before);
  });

  it('rejects whitespace-only title on update', () => {
    const created = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(() => updateArticle(db, created.id, { title: '   ' })).toThrow('whitespace');
  });

  it('rejects whitespace-only content on update', () => {
    const created = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(() => updateArticle(db, created.id, { content: '   ' })).toThrow('whitespace');
  });

  it('rejects duplicate slug on update within same portal', () => {
    createArticle(db, { portalId: 'p1', title: 'First', slug: 'taken-slug', content: 'c', authorId });
    const second = createArticle(db, { portalId: 'p1', title: 'Second', content: 'c', authorId });
    expect(() => updateArticle(db, second.id, { slug: 'taken-slug' })).toThrow('already in use');
  });

  it('allows same slug update on the same article', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', slug: 'my-slug', content: 'c', authorId });
    const updated = updateArticle(db, article.id, { slug: 'my-slug' });
    expect(updated?.slug).toBe('my-slug');
  });

  it('deletes an article', () => {
    const created = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(deleteArticle(db, created.id)).toBe(true);
    expect(getArticleById(db, created.id)).toBeUndefined();
    expect(deleteArticle(db, 'nonexistent')).toBe(false);
  });

  it('rejects whitespace-only title on create', () => {
    expect(() =>
      createArticle(db, { portalId: 'p1', title: '   ', content: 'c', authorId }),
    ).toThrow('whitespace');
  });

  it('rejects whitespace-only content on create', () => {
    expect(() =>
      createArticle(db, { portalId: 'p1', title: 'Test', content: '   ', authorId }),
    ).toThrow('whitespace');
  });

  it('trims title and content on create', () => {
    const article = createArticle(db, {
      portalId: 'p1',
      title: '  Getting Started  ',
      content: '  Welcome  ',
      authorId,
    });
    expect(article.title).toBe('Getting Started');
    expect(article.content).toBe('Welcome');
  });
});

describe('Article lifecycle', () => {
  beforeEach(() => {
    clearArticleStore();
  });

  it('publishes a draft article', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(article.status).toBe('draft');

    const published = publishArticle(db, article.id);
    expect(published?.status).toBe('published');
  });

  it('archives a published article', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    const archived = archiveArticle(db, article.id);
    expect(archived?.status).toBe('archived');
  });

  it('unarchives to draft', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    archiveArticle(db, article.id);
    const unarchived = unarchiveArticle(db, article.id);
    expect(unarchived?.status).toBe('draft');
  });

  it('rejects publishing an archived article', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    archiveArticle(db, article.id);
    expect(() => publishArticle(db, article.id)).toThrow();
  });

  it('rejects archiving a draft article', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(() => archiveArticle(db, article.id)).toThrow();
  });

  it('rejects unarchiving a published article', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    expect(() => unarchiveArticle(db, article.id)).toThrow();
  });

  it('no-ops when unarchiving a draft (already target status)', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    const result = unarchiveArticle(db, article.id);
    expect(result?.status).toBe('draft');
  });

  it('returns same article on self-transition (published→published)', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    const result = publishArticle(db, article.id);
    expect(result?.status).toBe('published');
  });

  it('returns undefined for nonexistent article transitions', () => {
    expect(publishArticle(db, 'nonexistent')).toBeUndefined();
    expect(archiveArticle(db, 'nonexistent')).toBeUndefined();
    expect(unarchiveArticle(db, 'nonexistent')).toBeUndefined();
  });

  it('full lifecycle: draft → published → archived → draft → published', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(article.status).toBe('draft');
    publishArticle(db, article.id);
    expect(getArticleById(db, article.id)?.status).toBe('published');
    archiveArticle(db, article.id);
    expect(getArticleById(db, article.id)?.status).toBe('archived');
    unarchiveArticle(db, article.id);
    expect(getArticleById(db, article.id)?.status).toBe('draft');
    publishArticle(db, article.id);
    expect(getArticleById(db, article.id)?.status).toBe('published');
  });

  it('transitionArticle rejects invalid transitions with clear message', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(() => transitionArticle(db, article.id, 'archived')).toThrow(
      'Cannot transition from "draft" to "archived"',
    );
  });
});

describe('View count tracking', () => {
  beforeEach(() => {
    clearArticleStore();
  });

  it('increments view count', () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(article.viewCount).toBe(0);

    incrementViewCount(db, article.id);
    incrementViewCount(db, article.id);
    incrementViewCount(db, article.id);

    expect(getArticleById(db, article.id)?.viewCount).toBe(3);
  });

  it('silently ignores nonexistent article', () => {
    expect(() => incrementViewCount(db, 'nonexistent')).not.toThrow();
  });
});

describe('Article search', () => {
  beforeEach(() => {
    clearArticleStore();
  });

  it('searches articles by title and content', () => {
    createArticle(db, { portalId: 'p1', title: 'Setup Guide', content: 'How to configure', authorId });
    createArticle(db, { portalId: 'p1', title: 'Billing FAQ', content: 'Payment methods', authorId });

    expect(searchArticles(db, 'setup')).toHaveLength(1);
    expect(searchArticles(db, 'configure')).toHaveLength(1);
    expect(searchArticles(db, 'payment')).toHaveLength(1);
    expect(searchArticles(db, 'nonexistent')).toHaveLength(0);
  });

  it('filters search by portal and status', () => {
    const a = createArticle(db, { portalId: 'p1', title: 'Guide', content: 'Content', authorId });
    createArticle(db, { portalId: 'p2', title: 'Guide', content: 'Content', authorId });
    publishArticle(db, a.id);

    expect(searchArticles(db, 'guide', { portalId: 'p1' })).toHaveLength(1);
    expect(searchArticles(db, 'guide', { status: 'published' })).toHaveLength(1);
    expect(searchArticles(db, 'guide', { status: 'draft' })).toHaveLength(1);
  });

  it('returns empty for empty query', () => {
    createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    expect(searchArticles(db, '')).toHaveLength(0);
    expect(searchArticles(db, '   ')).toHaveLength(0);
  });
});

describe('Article routes', () => {
  let app: Hono;

  beforeEach(() => {
    clearArticleStore();
    app = new Hono();
    app.route('/', createArticleRoutes(db));
  });

  it('POST creates an article', async () => {
    const res = await app.request('/portals/p1/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', content: 'Body', authorId }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe('Test');
    expect(json.data.status).toBe('draft');
  });

  it('POST rejects whitespace-only title', async () => {
    const res = await app.request('/portals/p1/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ', content: 'Body', authorId }),
    });
    expect(res.status).toBe(400);
  });

  it('GET lists articles for a portal', async () => {
    createArticle(db, { portalId: 'p1', title: 'A', content: 'a', authorId });
    const res = await app.request('/portals/p1/articles');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('GET filters articles by status', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'A', content: 'a', authorId });
    publishArticle(db, article.id);

    const res = await app.request('/portals/p1/articles?status=published');
    const json = await res.json();
    expect(json.data).toHaveLength(1);

    const res2 = await app.request('/portals/p1/articles?status=draft');
    const json2 = await res2.json();
    expect(json2.data).toHaveLength(0);
  });

  it('GET /articles/:id returns article and increments views', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    const res = await app.request(`/articles/${article.id}`);
    expect(res.status).toBe(200);

    expect(getArticleById(db, article.id)?.viewCount).toBe(1);
  });

  it('GET /articles/:id returns 400 for invalid UUID', async () => {
    const res = await app.request('/articles/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('GET /articles/:id returns 404 for missing article', async () => {
    const res = await app.request('/articles/00000000-0000-0000-0000-000000000099');
    expect(res.status).toBe(404);
  });

  it('PATCH updates an article', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Old', content: 'old', authorId });
    const res = await app.request(`/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('New');
  });

  it('PATCH returns 409 on slug collision', async () => {
    createArticle(db, { portalId: 'p1', title: 'First', slug: 'taken', content: 'c', authorId });
    const second = createArticle(db, { portalId: 'p1', title: 'Second', content: 'c', authorId });
    const res = await app.request(`/articles/${second.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'taken' }),
    });
    expect(res.status).toBe(409);
  });

  it('DELETE removes an article', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    const res = await app.request(`/articles/${article.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('POST /articles/:id/publish publishes an article', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    const res = await app.request(`/articles/${article.id}/publish`, { method: 'POST' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('published');
  });

  it('POST /articles/:id/publish returns 409 for invalid transition', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    archiveArticle(db, article.id);
    const res = await app.request(`/articles/${article.id}/publish`, { method: 'POST' });
    expect(res.status).toBe(409);
  });

  it('POST /articles/:id/archive archives a published article', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    const res = await app.request(`/articles/${article.id}/archive`, { method: 'POST' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('archived');
  });

  it('POST /articles/:id/archive returns 409 for invalid transition', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    const res = await app.request(`/articles/${article.id}/archive`, { method: 'POST' });
    expect(res.status).toBe(409);
  });

  it('POST /articles/:id/unarchive unarchives an article', async () => {
    const article = createArticle(db, { portalId: 'p1', title: 'Test', content: 'c', authorId });
    publishArticle(db, article.id);
    archiveArticle(db, article.id);
    const res = await app.request(`/articles/${article.id}/unarchive`, { method: 'POST' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('draft');
  });

  it('GET /articles/search searches articles', async () => {
    createArticle(db, { portalId: 'p1', title: 'Setup Guide', content: 'Configure your account', authorId });
    const res = await app.request('/articles/search?q=setup');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('GET /articles/search returns 400 without query', async () => {
    const res = await app.request('/articles/search');
    expect(res.status).toBe(400);
  });
});

describe('Public routes', () => {
  let app: Hono;

  beforeEach(() => {
    clearPortalStore();
    clearCategoryStore();
    clearArticleStore();
    app = new Hono();
    app.route('/help', createPublicRoutes(db));
  });

  it('GET /help/:portalSlug returns portal with categories', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    createCategory(db, { portalId: portal.id, name: 'Getting Started', slug: 'getting-started' });

    const res = await app.request('/help/help');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('Help');
    expect(json.data.categories).toHaveLength(1);
  });

  it('GET /help/:portalSlug returns 404 for inactive portal', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    updatePortal(db, portal.id, { active: false });

    const res = await app.request('/help/help');
    expect(res.status).toBe(404);
  });

  it('GET /help/:portalSlug/categories/:categorySlug returns category with published articles', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    const category = createCategory(db, { portalId: portal.id, name: 'Guides', slug: 'guides' });
    const article = createArticle(db, {
      portalId: portal.id,
      categoryId: category.id,
      title: 'Setup',
      content: 'How to set up',
      authorId,
    });
    publishArticle(db, article.id);

    createArticle(db, {
      portalId: portal.id,
      categoryId: category.id,
      title: 'Draft',
      content: 'Not published',
      authorId,
    });

    const res = await app.request('/help/help/categories/guides');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('Guides');
    expect(json.data.articles).toHaveLength(1);
    expect(json.data.articles[0].title).toBe('Setup');
  });

  it('public articles are sanitized (no authorId/portalId/categoryId)', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    const article = createArticle(db, {
      portalId: portal.id,
      title: 'Getting Started',
      content: 'Welcome',
      authorId,
    });
    publishArticle(db, article.id);

    const res = await app.request('/help/help/articles/getting-started');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('Getting Started');
    expect(json.data).not.toHaveProperty('authorId');
    expect(json.data).not.toHaveProperty('portalId');
    expect(json.data).not.toHaveProperty('categoryId');
  });

  it('GET /help/:portalSlug/articles/:articleSlug returns published article and increments views', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    const article = createArticle(db, {
      portalId: portal.id,
      title: 'Getting Started',
      content: 'Welcome',
      authorId,
    });
    publishArticle(db, article.id);

    const res = await app.request('/help/help/articles/getting-started');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe('Getting Started');

    expect(getArticleById(db, article.id)?.viewCount).toBe(1);
  });

  it('GET /help/:portalSlug/articles/:articleSlug returns 404 for draft article', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    createArticle(db, { portalId: portal.id, title: 'Draft', content: 'Not published', authorId });

    const res = await app.request('/help/help/articles/draft');
    expect(res.status).toBe(404);
  });

  it('GET /help/:portalSlug/search searches published articles', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    const article = createArticle(db, {
      portalId: portal.id,
      title: 'Setup Guide',
      content: 'Configure your account',
      authorId,
    });
    publishArticle(db, article.id);

    createArticle(db, { portalId: portal.id, title: 'Setup Draft', content: 'Draft setup', authorId });

    const res = await app.request('/help/help/search?q=setup');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('Setup Guide');
  });

  it('GET /help/:portalSlug/search returns 400 without query', async () => {
    createPortal(db, { name: 'Help', slug: 'help' });
    const res = await app.request('/help/help/search');
    expect(res.status).toBe(400);
  });
});
