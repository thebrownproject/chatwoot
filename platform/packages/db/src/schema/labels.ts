import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const labels = pgTable(
  'labels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex('idx_labels_name').on(table.name),
  }),
);

export const conversationLabels = pgTable(
  'conversation_labels',
  {
    conversationId: uuid('conversation_id').notNull(),
    labelId: uuid('label_id').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.labelId] }),
    conversationIdIdx: index('idx_conversation_labels_conversation_id').on(table.conversationId),
    labelIdIdx: index('idx_conversation_labels_label_id').on(table.labelId),
  }),
);
