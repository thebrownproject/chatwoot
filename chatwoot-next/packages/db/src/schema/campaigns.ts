import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import type {
  CampaignAudienceEntry,
  CampaignTemplateParams,
  CampaignTriggerRules,
} from './types';

/** Rails enum: { ongoing: 0, one_off: 1 } */
export type CampaignType = 0 | 1;
/** Rails enum: { active: 0, completed: 1 } */
export type CampaignStatus = 0 | 1;

export const campaigns = pgTable(
  'campaigns',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    displayId: integer('display_id').notNull(),
    title: varchar('title').notNull(),
    description: text('description'),
    message: text('message').notNull(),
    senderId: integer('sender_id'),
    enabled: boolean('enabled').default(true),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    inboxId: bigint('inbox_id', { mode: 'bigint' }).notNull(),
    triggerRules: jsonb('trigger_rules').$type<CampaignTriggerRules>().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    /** Enum: { ongoing: 0, one_off: 1 } */
    campaignType: integer('campaign_type').$type<CampaignType>().notNull().default(0),
    /** Enum: { active: 0, completed: 1 } */
    campaignStatus: integer('campaign_status').$type<CampaignStatus>().notNull().default(0),
    audience: jsonb('audience').$type<CampaignAudienceEntry[]>().default([]),
    scheduledAt: timestamp('scheduled_at', { precision: 6 }),
    triggerOnlyDuringBusinessHours: boolean('trigger_only_during_business_hours').default(false),
    templateParams: jsonb('template_params').$type<CampaignTemplateParams>(),
  },
  (table) => ({
    accountIdIdx: index('index_campaigns_on_account_id').on(table.accountId),
    campaignStatusIdx: index('index_campaigns_on_campaign_status').on(table.campaignStatus),
    campaignTypeIdx: index('index_campaigns_on_campaign_type').on(table.campaignType),
    inboxIdIdx: index('index_campaigns_on_inbox_id').on(table.inboxId),
    scheduledAtIdx: index('index_campaigns_on_scheduled_at').on(table.scheduledAt),
  }),
);
