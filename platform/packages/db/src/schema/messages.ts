import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const messageTypeEnum = pgEnum('message_type', ['text', 'rich', 'activity']);
export const messageVisibilityEnum = pgEnum('message_visibility', ['public', 'internal']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').notNull(),
    senderId: uuid('sender_id').notNull(),
    type: messageTypeEnum('type').notNull().default('text'),
    visibility: messageVisibilityEnum('visibility').notNull().default('public'),
    body: text('body').notNull(),
    bodyHtml: text('body_html'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    attachments: jsonb('attachments').$type<Array<{
      url: string;
      filename: string;
      contentType: string;
      size: number;
    }>>().default([]),
    searchVector: text('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('idx_messages_conversation_id').on(table.conversationId),
    senderIdIdx: index('idx_messages_sender_id').on(table.senderId),
    visibilityIdx: index('idx_messages_visibility').on(table.visibility),
    createdAtIdx: index('idx_messages_created_at').on(table.createdAt),
  }),
);
