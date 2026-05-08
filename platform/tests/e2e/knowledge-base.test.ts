/**
 * E2E: Knowledge base
 *
 * Tests portal + category + article lifecycle, draft/publish/archive
 * visibility, search, view counts, and category hierarchy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

describe('Knowledge Base', () => {
  let p: Platform;
  let authorId: string;

  beforeEach(() => {
    p = createPlatform();
    const author = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    authorId = author.id;
  });

  it('creates a portal with categories and articles', () => {
    const portal = p.createPortal({
      name: 'Buildpass Help Center',
      slug: 'help',
    });

    expect(portal.name).toBe('Buildpass Help Center');
    expect(portal.slug).toBe('help');
    expect(portal.active).toBe(true);

    const gettingStarted = p.createCategory({
      portalId: portal.id,
      name: 'Getting Started',
      slug: 'getting-started',
      description: 'Learn the basics of Buildpass',
    });

    expect(gettingStarted.portalId).toBe(portal.id);
    expect(gettingStarted.name).toBe('Getting Started');

    const article = p.createArticle({
      portalId: portal.id,
      categoryId: gettingStarted.id,
      title: 'How to create your first project',
      content: 'Follow these steps to create a project in Buildpass...',
      authorId,
    });

    expect(article.status).toBe('draft');
    expect(article.categoryId).toBe(gettingStarted.id);
    expect(article.viewCount).toBe(0);
    expect(article.slug).toBe('how-to-create-your-first-project');
  });

  it('draft article not visible on public routes', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    p.createArticle({
      portalId: portal.id,
      title: 'Draft Article',
      content: 'This is still being written...',
      authorId,
    });

    // Public route: only published articles
    const publicArticles = p.listPublishedArticles(portal.id);
    expect(publicArticles).toHaveLength(0);
  });

  it('publish article -> visible on public routes', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const article = p.createArticle({
      portalId: portal.id,
      title: 'Published Guide',
      content: 'This guide is ready for customers.',
      authorId,
    });

    expect(article.status).toBe('draft');

    const published = p.publishArticle(article.id);
    expect(published).toBeDefined();
    expect(published!.status).toBe('published');

    const publicArticles = p.listPublishedArticles(portal.id);
    expect(publicArticles).toHaveLength(1);
    expect(publicArticles[0]!.title).toBe('Published Guide');
  });

  it('archive article -> removed from public', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const article = p.createArticle({
      portalId: portal.id,
      title: 'Soon Archived',
      content: 'This will be archived.',
      authorId,
    });

    p.publishArticle(article.id);
    expect(p.listPublishedArticles(portal.id)).toHaveLength(1);

    const archived = p.archiveArticle(article.id);
    expect(archived).toBeDefined();
    expect(archived!.status).toBe('archived');

    // No longer in public list
    expect(p.listPublishedArticles(portal.id)).toHaveLength(0);
  });

  it('article search returns only published', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const draft = p.createArticle({
      portalId: portal.id,
      title: 'Building Permit Guide Draft',
      content: 'How to apply for a building permit...',
      authorId,
    });

    const published = p.createArticle({
      portalId: portal.id,
      title: 'Building Permit Application',
      content: 'Step by step guide to building permits in NSW.',
      authorId,
    });
    p.publishArticle(published.id);

    const archived = p.createArticle({
      portalId: portal.id,
      title: 'Old Building Permit Process',
      content: 'Building permit process from 2024 (deprecated).',
      authorId,
    });
    p.publishArticle(archived.id);
    p.archiveArticle(archived.id);

    // Search with status filter: only published
    const results = p.searchArticles('building permit', {
      portalId: portal.id,
      status: 'published',
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Building Permit Application');
  });

  it('view count increments on public access', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const article = p.createArticle({
      portalId: portal.id,
      title: 'Popular Article',
      content: 'Very popular content.',
      authorId,
    });
    p.publishArticle(article.id);

    expect(p.articles.get(article.id)!.viewCount).toBe(0);

    // Simulate public views
    p.incrementViewCount(article.id);
    p.incrementViewCount(article.id);
    p.incrementViewCount(article.id);

    expect(p.articles.get(article.id)!.viewCount).toBe(3);
  });

  it('category hierarchy works (parent -> child)', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const parent = p.createCategory({
      portalId: portal.id,
      name: 'Compliance',
      slug: 'compliance',
    });

    const child1 = p.createCategory({
      portalId: portal.id,
      name: 'Building Permits',
      slug: 'building-permits',
      parentCategoryId: parent.id,
    });

    const child2 = p.createCategory({
      portalId: portal.id,
      name: 'Inspections',
      slug: 'inspections',
      parentCategoryId: parent.id,
    });

    expect(child1.parentCategoryId).toBe(parent.id);
    expect(child2.parentCategoryId).toBe(parent.id);

    // Query subcategories
    const children = p.listSubCategories(parent.id);
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.name)).toContain('Building Permits');
    expect(children.map((c) => c.name)).toContain('Inspections');
  });

  it('portal slug uniqueness enforced', () => {
    p.createPortal({ name: 'Help', slug: 'help' });

    expect(() => {
      p.createPortal({ name: 'Another Help', slug: 'help' });
    }).toThrow('already exists');
  });

  it('articles across categories are searchable', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const cat1 = p.createCategory({
      portalId: portal.id,
      name: 'Permits',
      slug: 'permits',
    });

    const cat2 = p.createCategory({
      portalId: portal.id,
      name: 'Inspections',
      slug: 'inspections',
    });

    const a1 = p.createArticle({
      portalId: portal.id,
      categoryId: cat1.id,
      title: 'Permit Application Process',
      content: 'Step 1: gather documents...',
      authorId,
    });
    p.publishArticle(a1.id);

    const a2 = p.createArticle({
      portalId: portal.id,
      categoryId: cat2.id,
      title: 'Inspection Checklist',
      content: 'Before your inspection, ensure...',
      authorId,
    });
    p.publishArticle(a2.id);

    // Search across all categories
    const results = p.searchArticles('process', { portalId: portal.id, status: 'published' });
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Permit Application Process');
  });

  it('auto-generates slug from title', () => {
    const portal = p.createPortal({ name: 'Help', slug: 'help' });

    const article = p.createArticle({
      portalId: portal.id,
      title: 'How to Submit Your Building Application',
      content: 'Content...',
      authorId,
    });

    expect(article.slug).toBe('how-to-submit-your-building-application');
  });
});
