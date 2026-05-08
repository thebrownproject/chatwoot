/**
 * Article CRUD data access.
 *
 * Supports full lifecycle: draft -> published -> archived.
 * Full-text search uses a simple in-memory approach (placeholder for tsvector).
 * View count tracking is fire-and-forget.
 */

import { randomUUID } from 'node:crypto';
import type { ArticleRecord, ArticleCreate, ArticleUpdate, ArticleStatus } from '../types.js';

// ---------------------------------------------------------------------------
// In-memory store (placeholder until db package provides Drizzle schema)
// ---------------------------------------------------------------------------

const store = new Map<string, ArticleRecord>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function createArticle(
  _db: unknown,
  input: ArticleCreate,
): ArticleRecord {
  const now = new Date();
  const slug = input.slug || slugify(input.title);

  // Auto-assign position if not provided
  let position = input.position ?? 0;
  if (input.position === undefined) {
    const siblings = listArticlesByPortal(_db, input.portalId);
    position = siblings.length > 0
      ? Math.max(...siblings.map((a) => a.position)) + 1
      : 0;
  }

  const record: ArticleRecord = {
    id: randomUUID(),
    portalId: input.portalId,
    categoryId: input.categoryId ?? null,
    title: input.title,
    slug,
    content: input.content,
    contentHtml: input.contentHtml ?? null,
    status: 'draft',
    authorId: input.authorId,
    position,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  store.set(record.id, record);
  return record;
}

export function getArticleById(
  _db: unknown,
  id: string,
): ArticleRecord | undefined {
  return store.get(id);
}

export function getArticleBySlug(
  _db: unknown,
  slug: string,
): ArticleRecord | undefined {
  for (const article of store.values()) {
    if (article.slug === slug) return article;
  }
  return undefined;
}

export interface ListArticlesOptions {
  status?: ArticleStatus;
  categoryId?: string;
}

export function listArticlesByPortal(
  _db: unknown,
  portalId: string,
  options?: ListArticlesOptions,
): ArticleRecord[] {
  let results = Array.from(store.values())
    .filter((a) => a.portalId === portalId);

  if (options?.status) {
    results = results.filter((a) => a.status === options.status);
  }
  if (options?.categoryId) {
    results = results.filter((a) => a.categoryId === options.categoryId);
  }

  return results.sort((a, b) => a.position - b.position);
}

export function updateArticle(
  _db: unknown,
  id: string,
  input: ArticleUpdate,
): ArticleRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  const updated: ArticleRecord = {
    ...existing,
    ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    ...(input.title !== undefined && { title: input.title }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.content !== undefined && { content: input.content }),
    ...(input.contentHtml !== undefined && { contentHtml: input.contentHtml }),
    ...(input.position !== undefined && { position: input.position }),
    updatedAt: new Date(),
  };
  store.set(id, updated);
  return updated;
}

export function deleteArticle(
  _db: unknown,
  id: string,
): boolean {
  return store.delete(id);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export function publishArticle(
  _db: unknown,
  id: string,
): ArticleRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  const updated: ArticleRecord = {
    ...existing,
    status: 'published',
    updatedAt: new Date(),
  };
  store.set(id, updated);
  return updated;
}

export function archiveArticle(
  _db: unknown,
  id: string,
): ArticleRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  const updated: ArticleRecord = {
    ...existing,
    status: 'archived',
    updatedAt: new Date(),
  };
  store.set(id, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// View count
// ---------------------------------------------------------------------------

/**
 * Increment view count. Fire-and-forget — callers should not await this
 * or block the response on it.
 */
export function incrementViewCount(
  _db: unknown,
  id: string,
): void {
  const existing = store.get(id);
  if (existing) {
    store.set(id, { ...existing, viewCount: existing.viewCount + 1 });
  }
}

// ---------------------------------------------------------------------------
// Full-text search (in-memory placeholder for tsvector)
// ---------------------------------------------------------------------------

export function searchArticles(
  _db: unknown,
  query: string,
  options?: { portalId?: string; status?: ArticleStatus },
): ArticleRecord[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  let results = Array.from(store.values());

  if (options?.portalId) {
    results = results.filter((a) => a.portalId === options.portalId);
  }
  if (options?.status) {
    results = results.filter((a) => a.status === options.status);
  }

  return results.filter((article) => {
    const haystack = `${article.title} ${article.content}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Clear all articles. For testing only.
 */
export function clearArticleStore(): void {
  store.clear();
}
