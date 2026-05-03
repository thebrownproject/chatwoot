import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import type { InboxAutoAssignmentConfig, InboxCsatConfig } from './types.js';

/** Rails enum: { friendly: 0, professional: 1 } */
export type InboxSenderNameType = 0 | 1;

export const inboxes = pgTable(
  'inboxes',
  {
    // Rails: `id: :serial`
    id: serial('id').primaryKey(),
    channelId: integer('channel_id').notNull(),
    accountId: integer('account_id').notNull(),
    name: varchar('name').notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    channelType: varchar('channel_type'),
    enableAutoAssignment: boolean('enable_auto_assignment').default(true),
    greetingEnabled: boolean('greeting_enabled').default(false),
    greetingMessage: varchar('greeting_message'),
    emailAddress: varchar('email_address'),
    workingHoursEnabled: boolean('working_hours_enabled').default(false),
    outOfOfficeMessage: varchar('out_of_office_message'),
    timezone: varchar('timezone').default('UTC'),
    enableEmailCollect: boolean('enable_email_collect').default(true),
    csatSurveyEnabled: boolean('csat_survey_enabled').default(false),
    allowMessagesAfterResolved: boolean('allow_messages_after_resolved').default(true),
    autoAssignmentConfig: jsonb('auto_assignment_config').$type<InboxAutoAssignmentConfig>().default({}),
    lockToSingleConversation: boolean('lock_to_single_conversation').notNull().default(false),
    portalId: bigint('portal_id', { mode: 'bigint' }),
    /** Enum: { friendly: 0, professional: 1 } */
    senderNameType: integer('sender_name_type').$type<InboxSenderNameType>().notNull().default(0),
    businessName: varchar('business_name'),
    csatConfig: jsonb('csat_config').$type<InboxCsatConfig>().notNull().default({}),
  },
  (table) => ({
    accountIdIdx: index('index_inboxes_on_account_id').on(table.accountId),
    channelIdTypeIdx: index('index_inboxes_on_channel_id_and_channel_type').on(
      table.channelId,
      table.channelType,
    ),
    portalIdIdx: index('index_inboxes_on_portal_id').on(table.portalId),
  }),
);

export const inboxMembers = pgTable(
  'inbox_members',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    inboxId: integer('inbox_id').notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
  },
  (table) => ({
    inboxUserIdx: uniqueIndex('index_inbox_members_on_inbox_id_and_user_id').on(
      table.inboxId,
      table.userId,
    ),
    inboxIdIdx: index('index_inbox_members_on_inbox_id').on(table.inboxId),
  }),
);

export const contactInboxes = pgTable(
  'contact_inboxes',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    contactId: bigint('contact_id', { mode: 'bigint' }),
    inboxId: bigint('inbox_id', { mode: 'bigint' }),
    sourceId: text('source_id').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    hmacVerified: boolean('hmac_verified').default(false),
    pubsubToken: varchar('pubsub_token'),
  },
  (table) => ({
    contactIdIdx: index('index_contact_inboxes_on_contact_id').on(table.contactId),
    inboxSourceIdx: uniqueIndex('index_contact_inboxes_on_inbox_id_and_source_id').on(
      table.inboxId,
      table.sourceId,
    ),
    inboxIdIdx: index('index_contact_inboxes_on_inbox_id').on(table.inboxId),
    pubsubTokenIdx: uniqueIndex('index_contact_inboxes_on_pubsub_token').on(table.pubsubToken),
    sourceIdIdx: index('index_contact_inboxes_on_source_id').on(table.sourceId),
  }),
);

export const workingHours = pgTable(
  'working_hours',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    inboxId: bigint('inbox_id', { mode: 'bigint' }),
    accountId: bigint('account_id', { mode: 'bigint' }),
    dayOfWeek: integer('day_of_week').notNull(),
    closedAllDay: boolean('closed_all_day').default(false),
    openHour: integer('open_hour'),
    openMinutes: integer('open_minutes'),
    closeHour: integer('close_hour'),
    closeMinutes: integer('close_minutes'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    openAllDay: boolean('open_all_day').default(false),
  },
  (table) => ({
    accountIdIdx: index('index_working_hours_on_account_id').on(table.accountId),
    inboxIdIdx: index('index_working_hours_on_inbox_id').on(table.inboxId),
  }),
);

export const inboxAssignmentPolicies = pgTable(
  'inbox_assignment_policies',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    inboxId: bigint('inbox_id', { mode: 'bigint' }).notNull(),
    assignmentPolicyId: bigint('assignment_policy_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    assignmentPolicyIdIdx: index('index_inbox_assignment_policies_on_assignment_policy_id').on(
      table.assignmentPolicyId,
    ),
    inboxIdIdx: uniqueIndex('index_inbox_assignment_policies_on_inbox_id').on(table.inboxId),
  }),
);
