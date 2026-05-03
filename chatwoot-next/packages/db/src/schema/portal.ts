import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import type { ArticleMeta, PortalConfig, PortalSslSettings } from './types';

export const portals = pgTable(
  'portals',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    name: varchar('name').notNull(),
    slug: varchar('slug').notNull(),
    customDomain: varchar('custom_domain'),
    color: varchar('color'),
    homepageLink: varchar('homepage_link'),
    pageTitle: varchar('page_title'),
    headerText: text('header_text'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    config: jsonb('config').$type<PortalConfig>().default({ allowed_locales: ['en'] }),
    archived: boolean('archived').default(false),
    channelWebWidgetId: bigint('channel_web_widget_id', { mode: 'bigint' }),
    sslSettings: jsonb('ssl_settings').$type<PortalSslSettings>().notNull().default({}),
  },
  (table) => ({
    channelWebWidgetIdx: index('index_portals_on_channel_web_widget_id').on(table.channelWebWidgetId),
    customDomainIdx: uniqueIndex('index_portals_on_custom_domain').on(table.customDomain),
    slugIdx: uniqueIndex('index_portals_on_slug').on(table.slug),
  }),
);

// `portals_members` is a join table without an `id` (Rails: `id: false`).
export const portalsMembers = pgTable(
  'portals_members',
  {
    portalId: bigint('portal_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
  },
  (table) => ({
    portalUserIdx: uniqueIndex('index_portals_members_on_portal_id_and_user_id').on(
      table.portalId,
      table.userId,
    ),
    portalIdIdx: index('index_portals_members_on_portal_id').on(table.portalId),
    userIdIdx: index('index_portals_members_on_user_id').on(table.userId),
  }),
);

export const categories = pgTable(
  'categories',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    portalId: integer('portal_id').notNull(),
    name: varchar('name'),
    description: text('description'),
    position: integer('position'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    locale: varchar('locale').default('en'),
    slug: varchar('slug').notNull(),
    parentCategoryId: bigint('parent_category_id', { mode: 'bigint' }),
    associatedCategoryId: bigint('associated_category_id', { mode: 'bigint' }),
    icon: varchar('icon').default(''),
  },
  (table) => ({
    associatedCategoryIdx: index('index_categories_on_associated_category_id').on(
      table.associatedCategoryId,
    ),
    localeAccountIdx: index('index_categories_on_locale_and_account_id').on(
      table.locale,
      table.accountId,
    ),
    localeIdx: index('index_categories_on_locale').on(table.locale),
    parentCategoryIdx: index('index_categories_on_parent_category_id').on(table.parentCategoryId),
    slugLocalePortalIdx: uniqueIndex('index_categories_on_slug_and_locale_and_portal_id').on(
      table.slug,
      table.locale,
      table.portalId,
    ),
  }),
);

export const articles = pgTable(
  'articles',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    portalId: integer('portal_id').notNull(),
    categoryId: integer('category_id'),
    folderId: integer('folder_id'),
    title: varchar('title'),
    description: text('description'),
    content: text('content'),
    /** Enum: { draft: 0, published: 1, archived: 2 } */
    status: integer('status'),
    views: integer('views'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    authorId: bigint('author_id', { mode: 'bigint' }),
    associatedArticleId: bigint('associated_article_id', { mode: 'bigint' }),
    meta: jsonb('meta').$type<ArticleMeta>().default({}),
    slug: varchar('slug').notNull(),
    position: integer('position'),
    locale: varchar('locale').notNull().default('en'),
  },
  (table) => ({
    accountIdIdx: index('index_articles_on_account_id').on(table.accountId),
    associatedArticleIdx: index('index_articles_on_associated_article_id').on(
      table.associatedArticleId,
    ),
    authorIdIdx: index('index_articles_on_author_id').on(table.authorId),
    portalIdIdx: index('index_articles_on_portal_id').on(table.portalId),
    slugIdx: uniqueIndex('index_articles_on_slug').on(table.slug),
    statusIdx: index('index_articles_on_status').on(table.status),
    viewsIdx: index('index_articles_on_views').on(table.views),
  }),
);

export const folders = pgTable('folders', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  accountId: integer('account_id').notNull(),
  categoryId: integer('category_id').notNull(),
  name: varchar('name'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const relatedCategories = pgTable(
  'related_categories',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    categoryId: bigint('category_id', { mode: 'bigint' }),
    relatedCategoryId: bigint('related_category_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    catRelIdx: uniqueIndex('index_related_categories_on_category_id_and_related_category_id').on(
      table.categoryId,
      table.relatedCategoryId,
    ),
    relCatIdx: uniqueIndex('index_related_categories_on_related_category_id_and_category_id').on(
      table.relatedCategoryId,
      table.categoryId,
    ),
  }),
);
