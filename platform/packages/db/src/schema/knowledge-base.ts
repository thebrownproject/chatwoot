import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';
import { tz } from './column-helpers.js';
import { users } from './users.js';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'published',
  'archived',
]);

export const portals = pgTable('portals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  customDomain: text('custom_domain'),
  config: jsonb('config').notNull().default({}),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('idx_portals_slug').on(table.slug),
]);

export const portalsRelations = relations(portals, ({ many }) => ({
  categories: many(categories),
  articles: many(articles),
}));

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  portalId: uuid('portal_id')
    .notNull()
    .references(() => portals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  parentCategoryId: uuid('parent_category_id').references(() => categories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index('idx_categories_portal_id').on(table.portalId),
  uniqueIndex('idx_categories_portal_slug').on(table.portalId, table.slug),
]);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  portal: one(portals, {
    fields: [categories.portalId],
    references: [portals.id],
  }),
  parent: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.id],
    relationName: 'categoryParent',
  }),
  children: many(categories, { relationName: 'categoryParent' }),
  articles: many(articles),
}));

export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  portalId: uuid('portal_id')
    .notNull()
    .references(() => portals.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull().default(''),
  contentHtml: text('content_html'),
  status: articleStatusEnum('status').notNull().default('draft'),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  position: integer('position').notNull().default(0),
  searchVector: tsvector('search_vector'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index('idx_articles_portal_id').on(table.portalId),
  index('idx_articles_category_id').on(table.categoryId),
  uniqueIndex('idx_articles_portal_slug').on(table.portalId, table.slug),
  index('idx_articles_search').using('gin', table.searchVector),
]);

export const articlesRelations = relations(articles, ({ one }) => ({
  portal: one(portals, {
    fields: [articles.portalId],
    references: [portals.id],
  }),
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
}));
