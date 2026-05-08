/**
 * Portal CRUD data access.
 *
 * All functions take `db` as the first parameter — no raw DB imports.
 * Follows the module architecture pattern: route -> data function -> db package.
 */

import { randomUUID } from 'node:crypto';
import type { PortalRecord, PortalCreate, PortalUpdate } from '../types.js';

// ---------------------------------------------------------------------------
// In-memory store (placeholder until db package provides Drizzle schema)
// ---------------------------------------------------------------------------

const store = new Map<string, PortalRecord>();

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function createPortal(
  _db: unknown,
  input: PortalCreate,
): PortalRecord {
  // Enforce unique slug
  for (const portal of store.values()) {
    if (portal.slug === input.slug) {
      throw new Error(`Portal with slug "${input.slug}" already exists`);
    }
  }

  const now = new Date();
  const record: PortalRecord = {
    id: randomUUID(),
    name: input.name,
    slug: input.slug,
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

  // If changing slug, enforce uniqueness
  if (input.slug !== undefined && input.slug !== existing.slug) {
    for (const portal of store.values()) {
      if (portal.slug === input.slug) {
        throw new Error(`Portal with slug "${input.slug}" already exists`);
      }
    }
  }

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

/**
 * Clear all portals. For testing only.
 */
export function clearPortalStore(): void {
  store.clear();
}
