import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import type { CustomAttributeValues, CustomFilterQuery } from './types';

export const labels = pgTable(
  'labels',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    title: varchar('title'),
    description: text('description'),
    color: varchar('color').notNull().default('#1f93ff'),
    showOnSidebar: boolean('show_on_sidebar'),
    accountId: bigint('account_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_labels_on_account_id').on(table.accountId),
    titleAccountIdx: uniqueIndex('index_labels_on_title_and_account_id').on(
      table.title,
      table.accountId,
    ),
  }),
);

// acts_as_taggable_on standard tables
export const taggings = pgTable(
  'taggings',
  {
    id: serial('id').primaryKey(),
    tagId: integer('tag_id'),
    taggableType: varchar('taggable_type'),
    taggableId: integer('taggable_id'),
    taggerType: varchar('tagger_type'),
    taggerId: integer('tagger_id'),
    context: varchar('context', { length: 128 }),
    createdAt: timestamp('created_at', { precision: 6 }),
  },
  (table) => ({
    contextIdx: index('index_taggings_on_context').on(table.context),
    taggingsIdx: uniqueIndex('taggings_idx').on(
      table.tagId,
      table.taggableId,
      table.taggableType,
      table.context,
      table.taggerId,
      table.taggerType,
    ),
    tagIdIdx: index('index_taggings_on_tag_id').on(table.tagId),
    taggableContextIdx: index('index_taggings_on_taggable_id_and_taggable_type_and_context').on(
      table.taggableId,
      table.taggableType,
      table.context,
    ),
    taggingsIdy: index('taggings_idy').on(
      table.taggableId,
      table.taggableType,
      table.taggerId,
      table.context,
    ),
    taggableIdIdx: index('index_taggings_on_taggable_id').on(table.taggableId),
    taggableTypeIdx: index('index_taggings_on_taggable_type').on(table.taggableType),
    taggerIdx: index('index_taggings_on_tagger_id_and_tagger_type').on(table.taggerId, table.taggerType),
    taggerIdIdx: index('index_taggings_on_tagger_id').on(table.taggerId),
  }),
);

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    name: varchar('name'),
    taggingsCount: integer('taggings_count').default(0),
  },
  (table) => ({
    nameIdx: uniqueIndex('index_tags_on_name').on(table.name),
  }),
);

export const customAttributeDefinitions = pgTable(
  'custom_attribute_definitions',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    attributeDisplayName: varchar('attribute_display_name'),
    attributeKey: varchar('attribute_key'),
    /** Enum: { text: 0, number: 1, currency: 2, percent: 3, link: 4, date: 5, list: 6, checkbox: 7 } */
    attributeDisplayType: integer('attribute_display_type').default(0),
    defaultValue: integer('default_value'),
    /** Enum: { conversation_attribute: 0, contact_attribute: 1 } */
    attributeModel: integer('attribute_model').default(0),
    accountId: bigint('account_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    attributeDescription: text('attribute_description'),
    attributeValues: jsonb('attribute_values').$type<CustomAttributeValues>().default([]),
    regexPattern: varchar('regex_pattern'),
    regexCue: varchar('regex_cue'),
  },
  (table) => ({
    accountIdIdx: index('index_custom_attribute_definitions_on_account_id').on(table.accountId),
    attributeKeyModelIdx: uniqueIndex('attribute_key_model_index').on(
      table.attributeKey,
      table.attributeModel,
      table.accountId,
    ),
  }),
);

export const customFilters = pgTable(
  'custom_filters',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name').notNull(),
    /** Enum: { conversation: 0, contact: 1, report: 2 } */
    filterType: integer('filter_type').notNull().default(0),
    query: jsonb('query').$type<CustomFilterQuery>().notNull().default({}),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_custom_filters_on_account_id').on(table.accountId),
    userIdIdx: index('index_custom_filters_on_user_id').on(table.userId),
  }),
);

export const cannedResponses = pgTable('canned_responses', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull(),
  shortCode: varchar('short_code'),
  content: text('content'),
  createdAt: timestamp('created_at', { precision: 6 }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
});
