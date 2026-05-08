import { relations, sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

import { users } from './users.js';
import { messages } from './messages.js';
import { conversationLabels } from './labels.js';
import { channelConversations } from './channels.js';

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
    displayId: integer('display_id').generatedAlwaysAsIdentity().unique(),
    status: conversationStatusEnum('status').notNull().default('open'),
    channelOrigin: channelOriginEnum('channel_origin').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id),
    subject: text('subject'),
    priority: priorityEnum('priority').notNull().default('medium'),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
    firstReplyAt: timestamp('first_reply_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    searchVector: tsvector('search_vector').default(sql`''::tsvector`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_conversations_status').on(table.status),
    index('idx_conversations_assignee_id').on(table.assigneeId),
    index('idx_conversations_display_id').on(table.displayId),
    index('idx_conversations_search').using('gin', table.searchVector),
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
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_conversation_participant').on(
      table.conversationId,
      table.userId,
    ),
  ],
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

export const conversationEvents = pgTable(
  'conversation_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index('idx_conversation_events_conversation_id').on(table.conversationId),
  ],
);

export const conversationEventsRelations = relations(
  conversationEvents,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationEvents.conversationId],
      references: [conversations.id],
    }),
    actor: one(users, {
      fields: [conversationEvents.actorId],
      references: [users.id],
    }),
  }),
);
