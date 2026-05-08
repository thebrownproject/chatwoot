import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { conversations } from './conversations.js';

export const labels = pgTable('labels', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const labelsRelations = relations(labels, ({ many }) => ({
  conversationLabels: many(conversationLabels),
}));

export const conversationLabels = pgTable(
  'conversation_labels',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    labelId: uuid('label_id')
      .notNull()
      .references(() => labels.id),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.labelId] }),
  ],
);

export const conversationLabelsRelations = relations(
  conversationLabels,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationLabels.conversationId],
      references: [conversations.id],
    }),
    label: one(labels, {
      fields: [conversationLabels.labelId],
      references: [labels.id],
    }),
  }),
);
