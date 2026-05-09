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

  // --- New tests for fixes ---

  it('rejects whitespace-only name', () => {
    expect(() =>
      createCategory(db, { portalId: 'p1', name: '   ', slug: 'test' }),
    ).toThrow('Category name cannot be empty');
  });

  it('rejects whitespace-only slug', () => {
    expect(() =>
      createCategory(db, { portalId: 'p1', name: 'Test', slug: '   ' }),
    ).toThrow('Category slug cannot be empty');
  });

  it('trims name on create', () => {
    const cat = createCategory(db, { portalId: 'p1', name: '  Trimmed  ', slug: 'trimmed' });
    expect(cat.name).toBe('Trimmed');
  });

  it('normalizes slug to lowercase', () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'Test', slug: 'My-Slug' });
    expect(cat.slug).toBe('my-slug');
  });

  it('enforces slug uniqueness within portal', () => {
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'test' });
    expect(() =>
      createCategory(db, { portalId: 'p1', name: 'B', slug: 'test' }),
    ).toThrow('already exists in this portal');
  });

  it('allows same slug in different portals', () => {
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'test' });
    const cat = createCategory(db, { portalId: 'p2', name: 'B', slug: 'test' });
    expect(cat.slug).toBe('test');
  });

  it('enforces slug uniqueness on update', () => {
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b' });
    expect(() => updateCategory(db, b.id, { slug: 'a' })).toThrow(
      'already exists in this portal',
    );
  });

  it('allows updating to same slug (no-op)', () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const updated = updateCategory(db, cat.id, { slug: 'a' });
    expect(updated?.slug).toBe('a');
  });

  it('rejects nonexistent parent on create', () => {
    expect(() =>
      createCategory(db, { portalId: 'p1', name: 'Child', slug: 'child', parentCategoryId: 'nonexistent' }),
    ).toThrow('Parent category not found');
  });

  it('rejects parent from different portal', () => {
    const parent = createCategory(db, { portalId: 'p1', name: 'Parent', slug: 'parent' });
    expect(() =>
      createCategory(db, { portalId: 'p2', name: 'Child', slug: 'child', parentCategoryId: parent.id }),
    ).toThrow('same portal');
  });

  it('enforces maximum nesting depth', () => {
    let parentId: string | undefined;
    for (let i = 0; i < 5; i++) {
      const cat = createCategory(db, {
        portalId: 'p1',
        name: `Level ${i}`,
        slug: `level-${i}`,
        parentCategoryId: parentId,
      });
      parentId = cat.id;
    }
    expect(() =>
      createCategory(db, {
        portalId: 'p1',
        name: 'Too Deep',
        slug: 'too-deep',
        parentCategoryId: parentId,
      }),
    ).toThrow('Maximum nesting depth');
  });

  it('enforces depth limit on update re-parenting', () => {
    let parentId: string | undefined;
    for (let i = 0; i < 5; i++) {
      const cat = createCategory(db, {
        portalId: 'p1',
        name: `Level ${i}`,
        slug: `level-${i}`,
        parentCategoryId: parentId,
      });
      parentId = cat.id;
    }
    const orphan = createCategory(db, { portalId: 'p1', name: 'Orphan', slug: 'orphan' });
    expect(() =>
      updateCategory(db, orphan.id, { parentCategoryId: parentId }),
    ).toThrow('Maximum nesting depth');
  });

  it('rejects whitespace-only name on update', () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'Test', slug: 'test' });
    expect(() => updateCategory(db, cat.id, { name: '   ' })).toThrow(
      'Category name cannot be empty',
    );
  });

  it('returns unchanged category on empty update', () => {
    const cat = createCategory(db, { portalId: 'p1', name: 'Test', slug: 'test' });
    const result = updateCategory(db, cat.id, {});
    expect(result?.updatedAt).toEqual(cat.updatedAt);
  });

  it('detects 3-node cycle A→B→C→A', () => {
    const a = createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b', parentCategoryId: a.id });
    const c = createCategory(db, { portalId: 'p1', name: 'C', slug: 'c', parentCategoryId: b.id });
    expect(() => updateCategory(db, a.id, { parentCategoryId: c.id })).toThrow('circular');
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

  it('PATCH returns 409 for circular reference', async () => {
    const a = createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b', parentCategoryId: a.id });
    const res = await app.request(`/categories/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentCategoryId: b.id }),
    });
    expect(res.status).toBe(409);
  });

  it('PATCH returns 409 for duplicate slug', async () => {
    createCategory(db, { portalId: 'p1', name: 'A', slug: 'a' });
    const b = createCategory(db, { portalId: 'p1', name: 'B', slug: 'b' });
    const res = await app.request(`/categories/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'a' }),
    });
    expect(res.status).toBe(409);
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

  it('DELETE returns 409 for category with children', async () => {
    const parent = createCategory(db, { portalId: 'p1', name: 'Parent', slug: 'parent' });
    createCategory(db, { portalId: 'p1', name: 'Child', slug: 'child', parentCategoryId: parent.id });
    const res = await app.request(`/categories/${parent.id}`, { method: 'DELETE' });
    expect(res.status).toBe(409);
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
