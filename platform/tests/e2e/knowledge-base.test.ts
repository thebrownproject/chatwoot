/**
 * E2E: Knowledge base
 *
 * Portal/category/article CRUD, publish lifecycle, public routes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Knowledge base', () => {
  describe('Portals', () => {
    it('creates a portal', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Buildpass Help Center',
        slug: 'help',
      });

      expect(portal.name).toBe('Buildpass Help Center');
      expect(portal.slug).toBe('help');
      expect(portal.active).toBe(true);
      expect(portal.customDomain).toBeNull();
    });

    it('retrieves a portal by ID', () => {
      const created = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const fetched = p.knowledgeBase.portals.getById(p.db, created.id);
      expect(fetched?.id).toBe(created.id);
    });

    it('retrieves a portal by slug', () => {
      p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help-center',
      });

      const fetched = p.knowledgeBase.portals.getBySlug(p.db, 'help-center');
      expect(fetched?.slug).toBe('help-center');
    });

    it('lists all portals', () => {
      p.knowledgeBase.portals.create(p.db, { name: 'Portal A', slug: 'a' });
      p.knowledgeBase.portals.create(p.db, { name: 'Portal B', slug: 'b' });

      const list = p.knowledgeBase.portals.list(p.db);
      expect(list).toHaveLength(2);
    });

    it('updates a portal', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const updated = p.knowledgeBase.portals.update(p.db, portal.id, {
        name: 'Buildpass Help Center',
        customDomain: 'help.buildpass.ai',
      });

      expect(updated?.name).toBe('Buildpass Help Center');
      expect(updated?.customDomain).toBe('help.buildpass.ai');
    });

    it('enforces unique slugs', () => {
      p.knowledgeBase.portals.create(p.db, { name: 'Help', slug: 'help' });

      expect(() => {
        p.knowledgeBase.portals.create(p.db, { name: 'Help 2', slug: 'help' });
      }).toThrow(/already exists/);
    });

    it('can deactivate a portal', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Old Portal',
        slug: 'old',
      });

      const deactivated = p.knowledgeBase.portals.update(p.db, portal.id, {
        active: false,
      });

      expect(deactivated?.active).toBe(false);
    });
  });

  describe('Categories', () => {
    it('creates a category in a portal', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const category = p.knowledgeBase.categories.create(p.db, {
        portalId: portal.id,
        name: 'Getting Started',
        slug: 'getting-started',
      });

      expect(category.name).toBe('Getting Started');
      expect(category.portalId).toBe(portal.id);
      expect(category.position).toBe(0);
    });

    it('auto-increments position for new categories', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const cat1 = p.knowledgeBase.categories.create(p.db, {
        portalId: portal.id,
        name: 'Category 1',
        slug: 'cat-1',
      });

      const cat2 = p.knowledgeBase.categories.create(p.db, {
        portalId: portal.id,
        name: 'Category 2',
        slug: 'cat-2',
      });

      expect(cat2.position).toBe(cat1.position + 1);
    });

    it('supports subcategories', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const parent = p.knowledgeBase.categories.create(p.db, {
        portalId: portal.id,
        name: 'Permits',
        slug: 'permits',
      });

      const child = p.knowledgeBase.categories.create(p.db, {
        portalId: portal.id,
        name: 'Class 1A Permits',
        slug: 'class-1a',
        parentCategoryId: parent.id,
      });

      expect(child.parentCategoryId).toBe(parent.id);

      const subCategories = p.knowledgeBase.categories.listSubCategories(p.db, parent.id);
      expect(subCategories).toHaveLength(1);
      expect(subCategories[0]!.name).toBe('Class 1A Permits');
    });

    it('lists categories by portal', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      p.knowledgeBase.categories.create(p.db, { portalId: portal.id, name: 'Cat A', slug: 'a' });
      p.knowledgeBase.categories.create(p.db, { portalId: portal.id, name: 'Cat B', slug: 'b' });

      const list = p.knowledgeBase.categories.listByPortal(p.db, portal.id);
      expect(list).toHaveLength(2);
    });

    it('deletes a category', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });
      const cat = p.knowledgeBase.categories.create(p.db, {
        portalId: portal.id,
        name: 'Temp',
        slug: 'temp',
      });

      const deleted = p.knowledgeBase.categories.delete(p.db, cat.id);
      expect(deleted).toBe(true);

      const fetched = p.knowledgeBase.categories.getById(p.db, cat.id);
      expect(fetched).toBeUndefined();
    });
  });

  describe('Articles', () => {
    it('creates an article in draft status', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'How to apply for a permit',
        content: 'Step 1: Log in to Buildpass...',
        authorId: 'author-1',
      });

      expect(article.title).toBe('How to apply for a permit');
      expect(article.status).toBe('draft');
      expect(article.slug).toBe('how-to-apply-for-a-permit');
      expect(article.viewCount).toBe(0);
    });

    it('publishes an article', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Getting started',
        content: 'Welcome!',
        authorId: 'author-1',
      });

      expect(article.status).toBe('draft');

      const published = p.knowledgeBase.articles.publish(p.db, article.id);
      expect(published?.status).toBe('published');
    });

    it('archives a published article', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Old article',
        content: 'Deprecated info',
        authorId: 'author-1',
      });

      p.knowledgeBase.articles.publish(p.db, article.id);

      const archived = p.knowledgeBase.articles.archive(p.db, article.id);
      expect(archived?.status).toBe('archived');
    });

    it('full lifecycle: draft -> published -> archived', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Lifecycle test',
        content: 'Testing draft->published->archived',
        authorId: 'author-1',
      });

      expect(article.status).toBe('draft');

      const published = p.knowledgeBase.articles.publish(p.db, article.id);
      expect(published?.status).toBe('published');

      const archived = p.knowledgeBase.articles.archive(p.db, article.id);
      expect(archived?.status).toBe('archived');
    });

    it('tracks view count', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Popular article',
        content: 'Very helpful!',
        authorId: 'author-1',
      });

      expect(article.viewCount).toBe(0);

      p.knowledgeBase.articles.incrementViewCount(p.db, article.id);
      p.knowledgeBase.articles.incrementViewCount(p.db, article.id);
      p.knowledgeBase.articles.incrementViewCount(p.db, article.id);

      const fetched = p.knowledgeBase.articles.getById(p.db, article.id);
      expect(fetched?.viewCount).toBe(3);
    });

    it('searches articles by content', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Permit Application Guide',
        content: 'How to apply for building permits in Victoria',
        authorId: 'author-1',
      });

      p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Inspection Checklist',
        content: 'What to prepare before your building inspection',
        authorId: 'author-1',
      });

      const results = p.knowledgeBase.articles.search(p.db, 'permit');
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe('Permit Application Guide');
    });

    it('finds articles by slug', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'How to get started',
        content: 'First steps...',
        authorId: 'author-1',
      });

      const found = p.knowledgeBase.articles.getBySlug(p.db, 'how-to-get-started');
      expect(found).toBeDefined();
      expect(found?.title).toBe('How to get started');
    });

    it('lists articles by portal with status filter', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const a1 = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Draft article',
        content: 'WIP',
        authorId: 'author-1',
      });

      const a2 = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Published article',
        content: 'Live!',
        authorId: 'author-1',
      });
      p.knowledgeBase.articles.publish(p.db, a2.id);

      const all = p.knowledgeBase.articles.listByPortal(p.db, portal.id);
      expect(all).toHaveLength(2);

      const published = p.knowledgeBase.articles.listByPortal(p.db, portal.id, {
        status: 'published',
      });
      expect(published).toHaveLength(1);
      expect(published[0]!.title).toBe('Published article');
    });

    it('deletes an article', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'To be deleted',
        content: 'Bye',
        authorId: 'author-1',
      });

      const deleted = p.knowledgeBase.articles.delete(p.db, article.id);
      expect(deleted).toBe(true);

      const fetched = p.knowledgeBase.articles.getById(p.db, article.id);
      expect(fetched).toBeUndefined();
    });

    it('updates article content', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const article = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Original Title',
        content: 'Original content',
        authorId: 'author-1',
      });

      const updated = p.knowledgeBase.articles.update(p.db, article.id, {
        title: 'Updated Title',
        content: 'New content here',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.content).toBe('New content here');
    });
  });

  describe('Public routes (slug-based access)', () => {
    it('public portal access by slug', () => {
      p.knowledgeBase.portals.create(p.db, {
        name: 'Help Center',
        slug: 'help',
      });

      const portal = p.knowledgeBase.portals.getBySlug(p.db, 'help');
      expect(portal).toBeDefined();
      expect(portal?.active).toBe(true);
    });

    it('public article access by slug returns only published articles', () => {
      const portal = p.knowledgeBase.portals.create(p.db, {
        name: 'Help',
        slug: 'help',
      });

      const draft = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Draft Only',
        content: 'Not ready yet',
        authorId: 'author-1',
      });

      const published = p.knowledgeBase.articles.create(p.db, {
        portalId: portal.id,
        title: 'Live Article',
        content: 'This is live',
        authorId: 'author-1',
      });
      p.knowledgeBase.articles.publish(p.db, published.id);

      // Only published articles should show in public listings
      const publicArticles = p.knowledgeBase.articles.listByPortal(p.db, portal.id, {
        status: 'published',
      });
      expect(publicArticles).toHaveLength(1);
      expect(publicArticles[0]!.title).toBe('Live Article');
    });
  });
});
