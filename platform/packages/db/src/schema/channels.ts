import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { conversations } from './conversations.js';
import { tz } from './column-helpers.js';

export const channelTypeEnum = pgEnum('channel_type', [
  'email',
  'web_chat',
  'sms',
  'slack',
  'in_app',
]);

export const channels = pgTable('channels', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: channelTypeEnum('type').notNull(),
  name: text('name').notNull(),
  config: jsonb('config').default({}),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', tz)
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const channelConversations = pgTable(
  'channel_conversations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    externalId: text('external_id'),
    externalMetadata: jsonb('external_metadata').default({}),
  },
  (table) => [
    index('idx_channel_conversations_channel').on(table.channelId),
    index('idx_channel_conversations_conversation').on(table.conversationId),
  ],
);

export const channelsRelations = relations(channels, ({ many }) => ({
  channelConversations: many(channelConversations),
}));

export const channelConversationsRelations = relations(
  channelConversations,
  ({ one }) => ({
    channel: one(channels, {
      fields: [channelConversations.channelId],
      references: [channels.id],
    }),
    conversation: one(conversations, {
      fields: [channelConversations.conversationId],
      references: [conversations.id],
    }),
  }),
);
