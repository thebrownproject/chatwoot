import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import type { UiSettings, UserCustomAttributes, UserTokens } from './types';

/** Rails enum: { online: 0, offline: 1, busy: 2 } */
export type UserAvailability = 0 | 1 | 2;

export const users = pgTable(
  'users',
  {
    // Rails: `id: :serial` — integer primary key.
    id: serial('id').primaryKey(),
    provider: varchar('provider').notNull().default('email'),
    uid: varchar('uid').notNull().default(''),
    encryptedPassword: varchar('encrypted_password').notNull().default(''),
    resetPasswordToken: varchar('reset_password_token'),
    resetPasswordSentAt: timestamp('reset_password_sent_at', { precision: 6 }),
    rememberCreatedAt: timestamp('remember_created_at', { precision: 6 }),
    signInCount: integer('sign_in_count').notNull().default(0),
    currentSignInAt: timestamp('current_sign_in_at', { precision: 6 }),
    lastSignInAt: timestamp('last_sign_in_at', { precision: 6 }),
    currentSignInIp: varchar('current_sign_in_ip'),
    lastSignInIp: varchar('last_sign_in_ip'),
    confirmationToken: varchar('confirmation_token'),
    confirmedAt: timestamp('confirmed_at', { precision: 6 }),
    confirmationSentAt: timestamp('confirmation_sent_at', { precision: 6 }),
    unconfirmedEmail: varchar('unconfirmed_email'),
    name: varchar('name').notNull(),
    displayName: varchar('display_name'),
    email: varchar('email'),
    tokens: json('tokens').$type<UserTokens>(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    pubsubToken: varchar('pubsub_token'),
    /** Enum: { online: 0, offline: 1, busy: 2 } */
    availability: integer('availability').$type<UserAvailability>().default(0),
    uiSettings: jsonb('ui_settings').$type<UiSettings>().default({}),
    customAttributes: jsonb('custom_attributes').$type<UserCustomAttributes>().default({}),
    /** STI discriminator — e.g. 'SuperAdmin' for super-admin users. */
    type: varchar('type'),
    messageSignature: text('message_signature'),
    /** @activerecord-encrypted — text at the DB layer; ActiveRecord transparently encrypts. */
    otpSecret: varchar('otp_secret'),
    consumedTimestep: integer('consumed_timestep'),
    otpRequiredForLogin: boolean('otp_required_for_login').default(false),
    /** @activerecord-encrypted */
    otpBackupCodes: text('otp_backup_codes'),
  },
  (table) => ({
    emailIdx: index('index_users_on_email').on(table.email),
    otpRequiredIdx: index('index_users_on_otp_required_for_login').on(table.otpRequiredForLogin),
    otpSecretIdx: uniqueIndex('index_users_on_otp_secret').on(table.otpSecret),
    pubsubTokenIdx: uniqueIndex('index_users_on_pubsub_token').on(table.pubsubToken),
    resetPasswordTokenIdx: uniqueIndex('index_users_on_reset_password_token').on(table.resetPasswordToken),
    uidProviderIdx: uniqueIndex('index_users_on_uid_and_provider').on(table.uid, table.provider),
  }),
);

export const agentBots = pgTable(
  'agent_bots',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name'),
    description: varchar('description'),
    outgoingUrl: varchar('outgoing_url'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    accountId: bigint('account_id', { mode: 'bigint' }),
    /** Enum: { webhook: 0 } */
    botType: integer('bot_type').default(0),
    botConfig: jsonb('bot_config').default({}),
    secret: varchar('secret'),
  },
  (table) => ({
    accountIdIdx: index('index_agent_bots_on_account_id').on(table.accountId),
  }),
);

export const agentBotInboxes = pgTable('agent_bot_inboxes', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  inboxId: integer('inbox_id'),
  agentBotId: integer('agent_bot_id'),
  /** Enum: { active: 0, inactive: 1 } */
  status: integer('status').default(0),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  accountId: integer('account_id'),
});
