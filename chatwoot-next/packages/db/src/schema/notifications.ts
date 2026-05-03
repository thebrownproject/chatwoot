import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { NotificationMeta, NotificationSubscriptionAttributes } from './types';

export const notifications = pgTable(
  'notifications',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    /** Rails enum from `app/models/notification.rb` NOTIFICATION_TYPES (e.g.
     *  conversation_creation, conversation_assignment, assigned_conversation_new_message,
     *  conversation_mention, participating_conversation_new_message, sla_missed_first_response, …). */
    notificationType: integer('notification_type').notNull(),
    primaryActorType: varchar('primary_actor_type').notNull(),
    primaryActorId: bigint('primary_actor_id', { mode: 'bigint' }).notNull(),
    secondaryActorType: varchar('secondary_actor_type'),
    secondaryActorId: bigint('secondary_actor_id', { mode: 'bigint' }),
    readAt: timestamp('read_at', { precision: 6 }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    snoozedUntil: timestamp('snoozed_until'),
    lastActivityAt: timestamp('last_activity_at').default(sql`CURRENT_TIMESTAMP`),
    meta: jsonb('meta').$type<NotificationMeta>().default({}),
  },
  (table) => ({
    accountIdIdx: index('index_notifications_on_account_id').on(table.accountId),
    lastActivityIdx: index('index_notifications_on_last_activity_at').on(table.lastActivityAt),
    primaryActorIdx: index('uniq_primary_actor_per_account_notifications').on(
      table.primaryActorType,
      table.primaryActorId,
    ),
    secondaryActorIdx: index('uniq_secondary_actor_per_account_notifications').on(
      table.secondaryActorType,
      table.secondaryActorId,
    ),
    perfIdx: index('idx_notifications_performance').on(
      table.userId,
      table.accountId,
      table.snoozedUntil,
      table.readAt,
    ),
    userIdIdx: index('index_notifications_on_user_id').on(table.userId),
  }),
);

export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id'),
    userId: integer('user_id'),
    emailFlags: integer('email_flags').notNull().default(0),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    pushFlags: integer('push_flags').notNull().default(0),
  },
  (table) => ({
    accountUserIdx: uniqueIndex('by_account_user').on(table.accountId, table.userId),
  }),
);

export const notificationSubscriptions = pgTable(
  'notification_subscriptions',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    /** Rails enum SUBSCRIPTION_TYPES (e.g. browser_push, fcm, apns). */
    subscriptionType: integer('subscription_type').notNull(),
    subscriptionAttributes: jsonb('subscription_attributes')
      .$type<NotificationSubscriptionAttributes>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    identifier: text('identifier'),
  },
  (table) => ({
    identifierIdx: uniqueIndex('index_notification_subscriptions_on_identifier').on(table.identifier),
    userIdIdx: index('index_notification_subscriptions_on_user_id').on(table.userId),
  }),
);
