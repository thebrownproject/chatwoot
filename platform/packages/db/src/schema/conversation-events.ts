import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';
import { conversations } from './conversations.js';
import { tz } from './column-helpers.js';

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
    createdAt: timestamp('created_at', tz)
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index('idx_conversation_events_conversation').on(table.conversationId),
    index('idx_conversation_events_type').on(table.eventType),
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
