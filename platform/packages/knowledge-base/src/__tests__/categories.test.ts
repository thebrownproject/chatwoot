import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  createCategory,
  getCategoryById,
  listCategoriesByPortal,
  listSubCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
  clearCategoryStore,
} from '../data/categories.js';
import { createCategoryRoutes } from '../routes/categories.js';

const db = null;

describe('Category data access', () => {
  beforeEach(() => {
    clearCategoryStore();
  });

  it('creates a category', () => {
    const category = createCategory(db, {
      portalId: 'portal-1',
      name: 'Getting Started',
      slug: 'getting-started',
    });

    expect(category.id).toBeDefined();
    expect(category.name).toBe('Getting Started');
    expect(category.slug).toBe('getting-started');
    expect(category.portalId).toBe('portal-1');
    expect(category.position).toBe(0);
    expect(category.parentCategoryId).toBeNull();
  });

  it('auto-increments position', () => {
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const second = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b' });
    expect(second.position).toBe(1);
  });

  it('supports explicit position', () => {
    const cat = createCategory(db, {
      portalId: 'p1',
      name: 'A',
      slug: 'a',
      position: 5,
    });
    expect(cat.position).toBe(5);
  });

  it('supports hierarchical categories', () => {
    const parent = createCategory(db, {
      portalId: 'p1',
      name: 'Parent',
      slug: 'parent',
    });
    const child = createCategory(db, {
      portalId: 'p1',
      name: 'Child',
      slug: 'child',
      parentCategoryId: parent.id,
    });

    expect(child.parentCategoryId).toBe(parent.id);
    const subs = listSubCategories(db, parent.id);
    expect(subs).toHaveLength(1);
    expect(subs[0]!.id).toBe(child.id);
  });

  it('rejects circular parent references', () => {
    const a = createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b', parentCategoryId: a.id });
    expect(() => updateCategory(db, a.id, { parentCategoryId: b.id })).toThrow('circular');
  });

  it('rejects self-referencing parent', () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'Self', slug: 'self' });
    expect(() => updateCategory(db, cat.id, { parentCategoryId: cat.id })).toThrow('circular');
  });

  it('lists categories by portal ordered by position', () => {
    createCategory(db, { portalId: 'p1', name: 'B', slug: 'b', position: 2 });
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'a', position: 1 });
    createCategory(db, { portalId: 'p2', name: 'C', slug: 'c' });

    const p1Cats = listCategoriesByPortal(db, 'p1');
    expect(p1Cats).toHaveLength(2);
    expect(p1Cats[0]!.name).toBe('A');
    expect(p1Cats[1]!.name).toBe('B');
  });

  it('gets a category by id', () => {
    const created = createCategory(db, {
      portalId: 'p1',
      name: 'Test',
      slug: 'test',
    });
    expect(getCategoryById(db, created.id)?.name).toBe('Test');
    expect(getCategoryById(db, 'nonexistent')).toBeUndefined();
  });

  it('updates a category', () => {
    const cat = createCategory(db, {
      portalId: 'p1',
      name: 'Old',
      slug: 'old',
    });
    const updated = updateCategory(db, cat.id, { name: 'New' });
    expect(updated?.name).toBe('New');
    expect(updated?.slug).toBe('old');
  });

  it('deletes a category', () => {
    const cat = createCategory(db, {
      portalId: 'p1',
      name: 'Test',
      slug: 'test',
    });
    expect(deleteCategory(db, cat.id)).toBe(true);
    expect(getCategoryById(db, cat.id)).toBeUndefined();
    expect(deleteCategory(db, 'nonexistent')).toBe(false);
  });

  it('rejects deleting category with children', () => {
    const parent = createCategory(db, { portalId: 'p1', name: 'Parent', slug: 'parent' });
    createCategory(db, { portalId: 'p1', name: 'Child', slug: 'child', parentCategoryId: parent.id });
    expect(() => deleteCategory(db, parent.id)).toThrow('child categories');
  });

  it('reorders categories', () => {
    const a = createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b' });

    reorderCategories(db, [
      { id: a.id, position: 10 },
      { id: b.id, position: 5 },
    ]);

    const cats = listCategoriesByPortal(db, 'p1');
    expect(cats[0]!.name).toBe('B');
    expect(cats[0]!.position).toBe(5);
    expect(cats[1]!.name).toBe('A');
    expect(cats[1]!.position).toBe(10);
  });
});

describe('Category routes', () => {
  let app: Hono;

  beforeEach(() => {
    clearCategoryStore();
    app = new Hono();
    app.route('/', createCategoryRoutes(db));
  });

  it('POST creates a category', async () => {
    const res = await app.request('/portals/p1/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', slug: 'test' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe('Test');
    expect(json.data.portalId).toBe('p1');
  });

  it('GET lists categories for a portal', async () => {
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    createCategory(db, { portalId: 'p1', name: 'B', slug: 'b' });

    const res = await app.request('/portals/p1/categories');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it('PATCH updates a category', async () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'Old', slug: 'old' });
    const res = await app.request(`/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('New');
  });

  it('DELETE removes a category', async () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'Test', slug: 'test' });
    const res = await app.request(`/categories/${cat.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(getCategoryById(db, cat.id)).toBeUndefined();
  });

  it('DELETE returns 404 for missing category', async () => {
    const res = await app.request('/categories/nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('POST /categories/reorder reorders categories', async () => {
    const a = createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b' });

    const res = await app.request('/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions: [
          { id: a.id, position: 10 },
          { id: b.id, position: 5 },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const cats = listCategoriesByPortal(db, 'p1');
    expect(cats[0]!.name).toBe('B');
  });
});
