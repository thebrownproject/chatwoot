import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { tz } from './column-helpers.js';
import { tsvector } from './custom-types.js';
import { conversations } from './conversations.js';
import { users } from './users.js';

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'rich',
  'activity',
]);

export const visibilityEnum = pgEnum('visibility', ['public', 'internal']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id),
    type: messageTypeEnum('type').notNull().default('text'),
    visibility: visibilityEnum('visibility').notNull().default('public'),
    body: text('body').notNull(),
    bodyHtml: text('body_html'),
    metadata: jsonb('metadata').default({}),
    attachments: jsonb('attachments').default([]),
    searchVector: tsvector('search_vector').default(sql`''::tsvector`),
    createdAt: timestamp('created_at', tz)
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', tz)
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_messages_conversation_id').on(table.conversationId),
    index('idx_messages_sender_id').on(table.senderId),
    index('idx_messages_search').using('gin', table.searchVector),
  ],
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
}));
