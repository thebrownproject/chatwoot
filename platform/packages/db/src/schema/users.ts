import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { permissions } from './permissions.js';
import { conversationParticipants, conversations } from './conversations.js';
import { messages } from './messages.js';
import { cannedResponses } from './canned-responses.js';
import { teamMembers } from './teams.js';

export const userTypeEnum = pgEnum('user_type', [
  'human_agent',
  'ai_agent',
  'contact',
  'system',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: userTypeEnum('type').notNull(),
    name: text('name').notNull(),
    email: text('email'),
    avatarUrl: text('avatar_url'),
    metadata: jsonb('metadata').default({}),
    clerkId: text('clerk_id'),
    apiKeyHash: text('api_key_hash'),
    apiKeyLookupHash: text('api_key_lookup_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    uniqueIndex('idx_users_clerk_id').on(table.clerkId),
    uniqueIndex('idx_users_api_key_lookup_hash').on(table.apiKeyLookupHash),
    index('idx_users_type').on(table.type),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  permissions: many(permissions),
  participations: many(conversationParticipants),
  assignedConversations: many(conversations, {
    relationName: 'assignedConversations',
  }),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  cannedResponses: many(cannedResponses, { relationName: 'createdResponses' }),
  teamMemberships: many(teamMembers),
}));
