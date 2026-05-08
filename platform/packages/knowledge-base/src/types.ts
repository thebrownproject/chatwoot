/**
 * Knowledge base module types.
 *
 * Covers portals, categories, and articles for the customer-facing KB
 * that replaces help.buildpass.ai.
 */

// ---------------------------------------------------------------------------
// Article status
// ---------------------------------------------------------------------------

export type ArticleStatus = 'draft' | 'published' | 'archived';

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

export interface PortalRecord {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalCreate {
  name: string;
  slug: string;
  customDomain?: string | null;
  config?: Record<string, unknown>;
}

export interface PortalUpdate {
  name?: string;
  slug?: string;
  customDomain?: string | null;
  config?: Record<string, unknown>;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategoryRecord {
  id: string;
  portalId: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  parentCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreate {
  portalId: string;
  name: string;
  slug: string;
  description?: string | null;
  position?: number;
  parentCategoryId?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  position?: number;
  parentCategoryId?: string | null;
}

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

export interface ArticleRecord {
  id: string;
  portalId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  content: string;
  contentHtml: string | null;
  status: ArticleStatus;
  authorId: string;
  position: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleCreate {
  portalId: string;
  categoryId?: string | null;
  title: string;
  slug?: string;
  content: string;
  contentHtml?: string | null;
  authorId: string;
  position?: number;
}

export interface ArticleUpdate {
  categoryId?: string | null;
  title?: string;
  slug?: string;
  content?: string;
  contentHtml?: string | null;
  position?: number;
}
