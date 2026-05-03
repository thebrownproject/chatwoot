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

import type { IntegrationsHookSettings, WebhookSubscriptions } from './types';

export const webhooks = pgTable(
  'webhooks',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id'),
    inboxId: integer('inbox_id'),
    url: text('url'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    /** Enum: { account_type: 0, inbox_type: 1 } */
    webhookType: integer('webhook_type').default(0),
    subscriptions: jsonb('subscriptions')
      .$type<WebhookSubscriptions>()
      .default([
        'conversation_status_changed',
        'conversation_updated',
        'conversation_created',
        'contact_created',
        'contact_updated',
        'message_created',
        'message_updated',
        'webwidget_triggered',
      ]),
    name: varchar('name'),
    secret: varchar('secret'),
  },
  (table) => ({
    accountUrlIdx: uniqueIndex('index_webhooks_on_account_id_and_url').on(table.accountId, table.url),
  }),
);

export const integrationsHooks = pgTable('integrations_hooks', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  status: integer('status').default(1),
  inboxId: integer('inbox_id'),
  accountId: integer('account_id'),
  appId: varchar('app_id'),
  /** Enum (referenced via Rails app — stored as integer): hook_type = 0|1 (account/inbox). */
  hookType: integer('hook_type').default(0),
  referenceId: varchar('reference_id'),
  accessToken: varchar('access_token'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  settings: jsonb('settings').$type<IntegrationsHookSettings>().default({}),
});

export const dashboardApps = pgTable(
  'dashboard_apps',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    title: varchar('title').notNull(),
    content: jsonb('content').$type<unknown[]>().default([]),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_dashboard_apps_on_account_id').on(table.accountId),
    userIdIdx: index('index_dashboard_apps_on_user_id').on(table.userId),
  }),
);
