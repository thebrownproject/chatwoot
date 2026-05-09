import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  createPortal,
  getPortalById,
  getPortalBySlug,
  listPortals,
  updatePortal,
  deletePortal,
  clearPortalStore,
} from '../data/portals.js';
import { createPortalRoutes } from '../routes/portals.js';

const db = null; // In-memory store, no real DB needed

describe('Portal data access', () => {
  beforeEach(() => {
    clearPortalStore();
  });

  it('creates a portal', () => {
    const portal = createPortal(db, {
      name: 'Help Center',
      slug: 'help',
    });

    expect(portal.id).toBeDefined();
    expect(portal.name).toBe('Help Center');
    expect(portal.slug).toBe('help');
    expect(portal.active).toBe(true);
    expect(portal.customDomain).toBeNull();
    expect(portal.config).toEqual({});
  });

  it('creates a portal with optional fields', () => {
    const portal = createPortal(db, {
      name: 'Help Center',
      slug: 'help',
      customDomain: 'help.buildpass.ai',
      config: { theme: 'dark' },
    });

    expect(portal.customDomain).toBe('help.buildpass.ai');
    expect(portal.config).toEqual({ theme: 'dark' });
  });

  it('enforces unique slug', () => {
    createPortal(db, { name: 'First', slug: 'help' });
    expect(() => createPortal(db, { name: 'Second', slug: 'help' })).toThrow(
      'Portal with slug "help" already exists',
    );
  });

  it('normalizes slug to lowercase', () => {
    const portal = createPortal(db, { name: 'Test', slug: 'My-Portal' });
    expect(portal.slug).toBe('my-portal');
  });

  it('rejects duplicate slug case-insensitively', () => {
    createPortal(db, { name: 'First', slug: 'help' });
    expect(() => createPortal(db, { name: 'Second', slug: 'HELP' })).toThrow(
      'already exists',
    );
  });

  it('rejects whitespace-only name', () => {
    expect(() => createPortal(db, { name: '   ', slug: 'test' })).toThrow(
      'Portal name cannot be empty',
    );
  });

  it('rejects whitespace-only slug', () => {
    expect(() => createPortal(db, { name: 'Test', slug: '   ' })).toThrow(
      'Portal slug cannot be empty',
    );
  });

  it('trims name on create', () => {
    const portal = createPortal(db, { name: '  Help Center  ', slug: 'help' });
    expect(portal.name).toBe('Help Center');
  });

  it('gets a portal by id', () => {
    const created = createPortal(db, { name: 'Help Center', slug: 'help' });
    const found = getPortalById(db, created.id);
    expect(found).toEqual(created);
  });

  it('gets a portal by slug', () => {
    const created = createPortal(db, { name: 'Help Center', slug: 'help' });
    const found = getPortalBySlug(db, 'help');
    expect(found?.id).toBe(created.id);
  });

  it('returns undefined for missing portal', () => {
    expect(getPortalById(db, 'nonexistent')).toBeUndefined();
    expect(getPortalBySlug(db, 'nonexistent')).toBeUndefined();
  });

  it('lists all portals', () => {
    createPortal(db, { name: 'A', slug: 'a' });
    createPortal(db, { name: 'B', slug: 'b' });
    const all = listPortals(db);
    expect(all).toHaveLength(2);
  });

  it('updates a portal', () => {
    const created = createPortal(db, { name: 'Old', slug: 'old' });
    const updated = updatePortal(db, created.id, { name: 'New' });
    expect(updated?.name).toBe('New');
    expect(updated?.slug).toBe('old');
  });

  it('updates portal slug with uniqueness check', () => {
    createPortal(db, { name: 'A', slug: 'a' });
    const b = createPortal(db, { name: 'B', slug: 'b' });
    expect(() => updatePortal(db, b.id, { slug: 'a' })).toThrow(
      'Portal with slug "a" already exists',
    );
  });

  it('returns undefined when updating nonexistent portal', () => {
    expect(updatePortal(db, 'nonexistent', { name: 'X' })).toBeUndefined();
  });

  it('rejects whitespace-only name on update', () => {
    const portal = createPortal(db, { name: 'Test', slug: 'test' });
    expect(() => updatePortal(db, portal.id, { name: '   ' })).toThrow(
      'Portal name cannot be empty',
    );
  });

  it('rejects whitespace-only slug on update', () => {
    const portal = createPortal(db, { name: 'Test', slug: 'test' });
    expect(() => updatePortal(db, portal.id, { slug: '   ' })).toThrow(
      'Portal slug cannot be empty',
    );
  });

  it('returns unchanged portal on empty update', () => {
    const portal = createPortal(db, { name: 'Test', slug: 'test' });
    const result = updatePortal(db, portal.id, {});
    expect(result?.updatedAt).toEqual(portal.updatedAt);
  });

  it('deletes a portal', () => {
    const portal = createPortal(db, { name: 'Test', slug: 'test' });
    expect(deletePortal(db, portal.id)).toBe(true);
    expect(getPortalById(db, portal.id)).toBeUndefined();
  });

  it('returns false when deleting nonexistent portal', () => {
    expect(deletePortal(db, 'nonexistent')).toBe(false);
  });
});

describe('Portal routes', () => {
  let app: Hono;

  beforeEach(() => {
    clearPortalStore();
    app = new Hono();
    app.route('/portals', createPortalRoutes(db));
  });

  it('POST /portals creates a portal', async () => {
    const res = await app.request('/portals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Help', slug: 'help' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe('Help');
  });

  it('POST /portals returns 400 for invalid input', async () => {
    const res = await app.request('/portals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /portals lists portals', async () => {
    createPortal(db, { name: 'Help', slug: 'help' });
    const res = await app.request('/portals');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('GET /portals/:id returns a portal', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    const res = await app.request(`/portals/${portal.id}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(portal.id);
  });

  it('GET /portals/:id returns 404 for missing portal', async () => {
    const res = await app.request('/portals/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PATCH /portals/:id updates a portal', async () => {
    const portal = createPortal(db, { name: 'Old', slug: 'old' });
    const res = await app.request(`/portals/${portal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('New');
  });

  it('PATCH /portals/:id returns 409 for duplicate slug', async () => {
    createPortal(db, { name: 'A', slug: 'a' });
    const b = createPortal(db, { name: 'B', slug: 'b' });
    const res = await app.request(`/portals/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'a' }),
    });
    expect(res.status).toBe(409);
  });

  it('DELETE /portals/:id deletes a portal', async () => {
    const portal = createPortal(db, { name: 'Help', slug: 'help' });
    const res = await app.request(`/portals/${portal.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(getPortalById(db, portal.id)).toBeUndefined();
  });

  it('DELETE /portals/:id returns 404 for missing portal', async () => {
    const res = await app.request('/portals/nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
