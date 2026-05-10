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

const MAX_NESTING_DEPTH = 5;

function getNestingDepth(parentId: string | null): number {
  let depth = 0;
  let current = parentId;
  while (current) {
    depth++;
    if (depth > MAX_NESTING_DEPTH) return depth;
    const parent = store.get(current);
    current = parent?.parentCategoryId ?? null;
  }
  return depth;
}

export function createCategory(
  _db: unknown,
  input: CategoryCreate,
): CategoryRecord {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Category name cannot be empty');
  }

  const slug = input.slug.trim().toLowerCase();
  if (!slug) {
    throw new Error('Category slug cannot be empty');
  }

  // Enforce slug uniqueness within portal
  for (const cat of store.values()) {
    if (cat.portalId === input.portalId && cat.slug === slug) {
      throw new Error(`Category with slug "${slug}" already exists in this portal`);
    }
  }

  // Validate parent exists if provided
  const parentId = input.parentCategoryId ?? null;
  if (parentId) {
    const parent = store.get(parentId);
    if (!parent) {
      throw new Error('Parent category not found');
    }
    if (parent.portalId !== input.portalId) {
      throw new Error('Parent category must belong to the same portal');
    }
  }

  // Enforce nesting depth limit
  if (parentId) {
    const depth = getNestingDepth(parentId);
    if (depth >= MAX_NESTING_DEPTH) {
      throw new Error(`Maximum nesting depth of ${MAX_NESTING_DEPTH} exceeded`);
    }
  }

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
    name: trimmedName,
    slug,
    description: input.description ?? null,
    position,
    parentCategoryId: parentId,
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

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');
    input = { ...input, name: trimmed };
  }

  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase();
    if (!slug) throw new Error('Category slug cannot be empty');
    if (slug !== existing.slug) {
      for (const cat of store.values()) {
        if (cat.portalId === existing.portalId && cat.slug === slug && cat.id !== id) {
          throw new Error(`Category with slug "${slug}" already exists in this portal`);
        }
      }
    }
    input = { ...input, slug };
  }

  if (input.parentCategoryId !== undefined) {
    if (wouldCreateCycle(id, input.parentCategoryId)) {
      throw new Error('Cannot set parent: would create a circular reference');
    }
    if (input.parentCategoryId) {
      const depth = getNestingDepth(input.parentCategoryId);
      if (depth >= MAX_NESTING_DEPTH) {
        throw new Error(`Maximum nesting depth of ${MAX_NESTING_DEPTH} exceeded`);
      }
    }
  }

  const hasChanges = Object.keys(input).length > 0;
  if (!hasChanges) return existing;

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
