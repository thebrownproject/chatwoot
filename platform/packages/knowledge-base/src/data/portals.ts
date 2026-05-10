/**
 * Portal CRUD data access.
 *
 * All functions take `db` as the first parameter — no raw DB imports.
 * Follows the module architecture pattern: route -> data function -> db package.
 */

import { randomUUID } from 'node:crypto';
import type { PortalRecord, PortalCreate, PortalUpdate } from '../types.js';

// ---------------------------------------------------------------------------
// In-memory store. Replace with Drizzle queries against @buildpass/db.
// Not multi-process safe -- each process would have its own copy.
// ---------------------------------------------------------------------------

/** In-memory only. Replace with DB queries for multi-process deployment. */
const store = new Map<string, PortalRecord>();

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function createPortal(
  _db: unknown,
  input: PortalCreate,
): PortalRecord {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Portal name cannot be empty');
  }

  const slug = input.slug.trim().toLowerCase();
  if (!slug) {
    throw new Error('Portal slug cannot be empty');
  }

  for (const portal of store.values()) {
    if (portal.slug === slug) {
      throw new Error(`Portal with slug "${slug}" already exists`);
    }
  }

  const now = new Date();
  const record: PortalRecord = {
    id: randomUUID(),
    name: trimmedName,
    slug,
    customDomain: input.customDomain ?? null,
    config: input.config ?? {},
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  store.set(record.id, record);
  return record;
}

export function getPortalById(
  _db: unknown,
  id: string,
): PortalRecord | undefined {
  return store.get(id);
}

export function getPortalBySlug(
  _db: unknown,
  slug: string,
): PortalRecord | undefined {
  for (const portal of store.values()) {
    if (portal.slug === slug) return portal;
  }
  return undefined;
}

export function listPortals(_db: unknown): PortalRecord[] {
  return Array.from(store.values());
}

export function updatePortal(
  _db: unknown,
  id: string,
  input: PortalUpdate,
): PortalRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error('Portal name cannot be empty');
    input = { ...input, name: trimmed };
  }

  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase();
    if (!slug) throw new Error('Portal slug cannot be empty');
    input = { ...input, slug };

    if (slug !== existing.slug) {
      for (const portal of store.values()) {
        if (portal.slug === slug) {
          throw new Error(`Portal with slug "${slug}" already exists`);
        }
      }
    }
  }

  const hasChanges = Object.keys(input).length > 0;
  if (!hasChanges) return existing;

  const updated: PortalRecord = {
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.customDomain !== undefined && { customDomain: input.customDomain }),
    ...(input.config !== undefined && { config: input.config }),
    ...(input.active !== undefined && { active: input.active }),
    updatedAt: new Date(),
  };
  store.set(id, updated);
  return updated;
}

export function deletePortal(
  _db: unknown,
  id: string,
): boolean {
  return store.delete(id);
}

/**
 * Clear all portals. For testing only.
 */
export function clearPortalStore(): void {
  store.clear();
}
