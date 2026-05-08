/**
 * Category CRUD data access.
 *
 * Supports hierarchical categories via parentCategoryId (self-referential).
 * Categories belong to a portal and are ordered by position.
 */

import { randomUUID } from 'node:crypto';
import type { CategoryRecord, CategoryCreate, CategoryUpdate } from '../types.js';

// ---------------------------------------------------------------------------
// In-memory store (placeholder until db package provides Drizzle schema)
// ---------------------------------------------------------------------------

const store = new Map<string, CategoryRecord>();

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function createCategory(
  _db: unknown,
  input: CategoryCreate,
): CategoryRecord {
  const now = new Date();

  // Auto-assign position if not provided: next position in the portal
  let position = input.position ?? 0;
  if (input.position === undefined) {
    const siblings = listCategoriesByPortal(_db, input.portalId);
    position = siblings.length > 0
      ? Math.max(...siblings.map((c) => c.position)) + 1
      : 0;
  }

  const record: CategoryRecord = {
    id: randomUUID(),
    portalId: input.portalId,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    position,
    parentCategoryId: input.parentCategoryId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  store.set(record.id, record);
  return record;
}

export function getCategoryById(
  _db: unknown,
  id: string,
): CategoryRecord | undefined {
  return store.get(id);
}

export function listCategoriesByPortal(
  _db: unknown,
  portalId: string,
): CategoryRecord[] {
  return Array.from(store.values())
    .filter((c) => c.portalId === portalId)
    .sort((a, b) => a.position - b.position);
}

export function listSubCategories(
  _db: unknown,
  parentCategoryId: string,
): CategoryRecord[] {
  return Array.from(store.values())
    .filter((c) => c.parentCategoryId === parentCategoryId)
    .sort((a, b) => a.position - b.position);
}

function wouldCreateCycle(categoryId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === categoryId) return true;
  const visited = new Set<string>();
  let current = newParentId;
  while (current) {
    if (visited.has(current)) return true;
    if (current === categoryId) return true;
    visited.add(current);
    const parent = store.get(current);
    current = parent?.parentCategoryId ?? '';
    if (!current) break;
  }
  return false;
}

export function updateCategory(
  _db: unknown,
  id: string,
  input: CategoryUpdate,
): CategoryRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  if (input.parentCategoryId !== undefined && wouldCreateCycle(id, input.parentCategoryId)) {
    throw new Error('Cannot set parent: would create a circular reference');
  }

  const updated: CategoryRecord = {
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.position !== undefined && { position: input.position }),
    ...(input.parentCategoryId !== undefined && { parentCategoryId: input.parentCategoryId }),
    updatedAt: new Date(),
  };
  store.set(id, updated);
  return updated;
}

export function deleteCategory(
  _db: unknown,
  id: string,
): boolean {
  const children = listSubCategories(_db, id);
  if (children.length > 0) {
    throw new Error('Cannot delete category with child categories. Move or delete children first.');
  }
  return store.delete(id);
}

/**
 * Reorder categories by setting new positions.
 * Accepts an array of { id, position } pairs.
 */
export function reorderCategories(
  _db: unknown,
  positions: Array<{ id: string; position: number }>,
): void {
  const now = new Date();
  for (const { id, position } of positions) {
    const existing = store.get(id);
    if (existing) {
      store.set(id, { ...existing, position, updatedAt: now });
    }
  }
}

/**
 * Clear all categories. For testing only.
 */
export function clearCategoryStore(): void {
  store.clear();
}
