import { randomUUID } from 'node:crypto';
import type { ArticleRecord, ArticleCreate, ArticleUpdate, ArticleStatus } from '../types.js';

/** In-memory only. Replace with DB queries for multi-process deployment. */
const store = new Map<string, ArticleRecord>();

const VALID_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: ['draft'],
};

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `article-${Date.now()}`;
}

function uniqueSlug(_db: unknown, portalId: string, baseSlug: string, excludeId?: string): string {
  const existing = listArticlesByPortal(_db, portalId);
  const slugs = new Set(existing.filter((a) => a.id !== excludeId).map((a) => a.slug));
  if (!slugs.has(baseSlug)) return baseSlug;
  let i = 2;
  while (slugs.has(`${baseSlug}-${i}`)) i++;
  return `${baseSlug}-${i}`;
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} cannot be empty or whitespace-only`);
  }
  return trimmed;
}

export function createArticle(
  _db: unknown,
  input: ArticleCreate,
): ArticleRecord {
  const now = new Date();
  const title = requireNonEmpty(input.title, 'title');
  const content = requireNonEmpty(input.content, 'content');
  const baseSlug = input.slug ? requireNonEmpty(input.slug, 'slug') : slugify(title);
  const slug = uniqueSlug(_db, input.portalId, baseSlug);

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
    title,
    slug,
    content,
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
  portalId?: string,
): ArticleRecord | undefined {
  for (const article of store.values()) {
    if (article.slug === slug && (!portalId || article.portalId === portalId)) {
      return article;
    }
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

  const hasChanges = Object.keys(input).some(
    (key) => input[key as keyof ArticleUpdate] !== undefined,
  );
  if (!hasChanges) return existing;

  if (input.title !== undefined) {
    requireNonEmpty(input.title, 'title');
  }
  if (input.content !== undefined) {
    requireNonEmpty(input.content, 'content');
  }
  if (input.slug !== undefined) {
    const trimmedSlug = requireNonEmpty(input.slug, 'slug');
    const conflict = uniqueSlug(_db, existing.portalId, trimmedSlug, existing.id);
    if (conflict !== trimmedSlug) {
      throw new Error(`Slug "${trimmedSlug}" is already in use in this portal`);
    }
  }

  const updated: ArticleRecord = {
    ...existing,
    ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    ...(input.title !== undefined && { title: input.title.trim() }),
    ...(input.slug !== undefined && { slug: input.slug.trim() }),
    ...(input.content !== undefined && { content: input.content.trim() }),
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

export function transitionArticle(
  _db: unknown,
  id: string,
  targetStatus: ArticleStatus,
): ArticleRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;

  if (existing.status === targetStatus) return existing;

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Cannot transition from "${existing.status}" to "${targetStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }

  const updated: ArticleRecord = {
    ...existing,
    status: targetStatus,
    updatedAt: new Date(),
  };
  store.set(id, updated);
  return updated;
}

export function publishArticle(
  _db: unknown,
  id: string,
): ArticleRecord | undefined {
  return transitionArticle(_db, id, 'published');
}

export function archiveArticle(
  _db: unknown,
  id: string,
): ArticleRecord | undefined {
  return transitionArticle(_db, id, 'archived');
}

export function unarchiveArticle(
  _db: unknown,
  id: string,
): ArticleRecord | undefined {
  return transitionArticle(_db, id, 'draft');
}

// ---------------------------------------------------------------------------
// View count
// ---------------------------------------------------------------------------

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

export function clearArticleStore(): void {
  store.clear();
}
