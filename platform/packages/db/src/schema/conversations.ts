import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';
import { messages } from './messages.js';
import { conversationEvents } from './conversation-events.js';
import { conversationLabels } from './labels.js';
import { channelConversations } from './channels.js';
import { tz } from './column-helpers.js';

export const conversationStatusEnum = pgEnum('conversation_status', [
  'open',
  'pending',
  'snoozed',
  'resolved',
]);

export const channelOriginEnum = pgEnum('channel_origin', [
  'email',
  'web_chat',
  'sms',
  'slack',
  'in_app',
]);

export const priorityEnum = pgEnum('priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const participantRoleEnum = pgEnum('participant_role', [
  'contact',
  'assignee',
  'observer',
  'copilot',
]);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    displayId: serial('display_id').notNull(),
    status: conversationStatusEnum('status').notNull().default('open'),
    channelOrigin: channelOriginEnum('channel_origin').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id),
    subject: text('subject'),
    priority: priorityEnum('priority').notNull().default('medium'),
    snoozedUntil: timestamp('snoozed_until', tz),
    firstReplyAt: timestamp('first_reply_at', tz),
    resolvedAt: timestamp('resolved_at', tz),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', tz)
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', tz)
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_conversations_status').on(table.status),
    index('idx_conversations_assignee').on(table.assigneeId),
    index('idx_conversations_channel_origin').on(table.channelOrigin),
    index('idx_conversations_created_at').on(table.createdAt),
  ],
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: participantRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', tz)
      .notNull()
      .default(sql`now()`),
    leftAt: timestamp('left_at', tz),
  },
  (table) => [
    index('idx_participants_conversation').on(table.conversationId),
    index('idx_participants_user').on(table.userId),
  ],
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    assignee: one(users, {
      fields: [conversations.assigneeId],
      references: [users.id],
      relationName: 'assignedConversations',
    }),
    participants: many(conversationParticipants),
    messages: many(messages),
    events: many(conversationEvents),
    labels: many(conversationLabels),
    channelConversations: many(channelConversations),
  }),
);

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationParticipants.userId],
      references: [users.id],
    }),
  }),
);
