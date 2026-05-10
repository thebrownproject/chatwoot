import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { tz } from './column-helpers.js';
import { conversations } from './conversations.js';

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
}, (table) => [
  index('idx_channels_type').on(table.type),
]);

export const channelsRelations = relations(channels, ({ many }) => ({
  channelConversations: many(channelConversations),
}));

export const channelConversations = pgTable(
  'channel_conversations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    externalMetadata: jsonb('external_metadata').default({}),
  },
  (table) => [
    unique('uq_channel_external_id').on(table.channelId, table.externalId),
  ],
);

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
