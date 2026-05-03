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

import type {
  AccountCustomAttributes,
  AccountInternalAttributes,
  AccountLimits,
  AccountSettings,
} from './types';

/** Rails enum: { active: 0, suspended: 1 } */
export type AccountStatus = 0 | 1;

export const accounts = pgTable(
  'accounts',
  {
    // Rails: `id: :serial` — integer primary key, not bigint.
    id: serial('id').primaryKey(),
    name: varchar('name').notNull(),
    createdAt: timestamp('created_at', { precision: 6, withTimezone: false }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6, withTimezone: false }).notNull(),
    locale: integer('locale').default(0),
    domain: varchar('domain', { length: 100 }),
    supportEmail: varchar('support_email', { length: 100 }),
    featureFlags: bigint('feature_flags', { mode: 'bigint' }).notNull().default(0n),
    autoResolveDuration: integer('auto_resolve_duration'),
    limits: jsonb('limits').$type<AccountLimits>().default({}),
    customAttributes: jsonb('custom_attributes').$type<AccountCustomAttributes>().default({}),
    /** Enum mapping in `app/models/account.rb`: { active: 0, suspended: 1 } */
    status: integer('status').$type<AccountStatus>().default(0),
    internalAttributes: jsonb('internal_attributes').$type<AccountInternalAttributes>().notNull().default({}),
    settings: jsonb('settings').$type<AccountSettings>().default({}),
  },
  (table) => ({
    statusIdx: index('index_accounts_on_status').on(table.status),
  }),
);

export const accountUsers = pgTable(
  'account_users',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }),
    userId: bigint('user_id', { mode: 'bigint' }),
    /** Enum: { agent: 0, administrator: 1 } */
    role: integer('role').default(0),
    inviterId: bigint('inviter_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    activeAt: timestamp('active_at', { precision: 6 }),
    /** Enum: { online: 0, offline: 1, busy: 2 } */
    availability: integer('availability').notNull().default(0),
    autoOffline: boolean('auto_offline').notNull().default(true),
    customRoleId: bigint('custom_role_id', { mode: 'bigint' }),
    agentCapacityPolicyId: bigint('agent_capacity_policy_id', { mode: 'bigint' }),
  },
  (table) => ({
    uniqUserPerAccount: uniqueIndex('uniq_user_id_per_account_id').on(table.accountId, table.userId),
    accountIdIdx: index('index_account_users_on_account_id').on(table.accountId),
    userIdIdx: index('index_account_users_on_user_id').on(table.userId),
    customRoleIdIdx: index('index_account_users_on_custom_role_id').on(table.customRoleId),
    agentCapacityPolicyIdIdx: index('index_account_users_on_agent_capacity_policy_id').on(
      table.agentCapacityPolicyId,
    ),
  }),
);

export const accessTokens = pgTable(
  'access_tokens',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    ownerType: varchar('owner_type'),
    ownerId: bigint('owner_id', { mode: 'bigint' }),
    token: varchar('token'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    ownerIdx: index('index_access_tokens_on_owner_type_and_owner_id').on(table.ownerType, table.ownerId),
    tokenIdx: uniqueIndex('index_access_tokens_on_token').on(table.token),
  }),
);

// Rails super_admins are users with type='SuperAdmin' (STI on the users table)
// — there is no separate super_admins table in schema.rb. Documented here for completeness.

// platform_apps and related (used for managing API access at the platform level)
export const platformApps = pgTable('platform_apps', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const platformAppPermissibles = pgTable(
  'platform_app_permissibles',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    platformAppId: bigint('platform_app_id', { mode: 'bigint' }).notNull(),
    permissibleType: varchar('permissible_type').notNull(),
    permissibleId: bigint('permissible_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    permissiblesIdx: index('index_platform_app_permissibles_on_permissibles').on(
      table.permissibleType,
      table.permissibleId,
    ),
    uniquePermissibles: uniqueIndex('unique_permissibles_index').on(
      table.platformAppId,
      table.permissibleId,
      table.permissibleType,
    ),
    platformAppIdIdx: index('index_platform_app_permissibles_on_platform_app_id').on(table.platformAppId),
  }),
);

export const platformBanners = pgTable('platform_banners', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  bannerMessage: text('banner_message').notNull(),
  /** Enum: { info: 0, warning: 1, error: 2 } */
  bannerType: integer('banner_type').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});
