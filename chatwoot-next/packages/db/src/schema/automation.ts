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
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import type {
  AgentCapacityExclusionRules,
  AutomationActions,
  AutomationConditions,
  MacroActions,
} from './types';

export const automationRules = pgTable(
  'automation_rules',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    name: varchar('name').notNull(),
    description: text('description'),
    eventName: varchar('event_name').notNull(),
    conditions: jsonb('conditions').$type<AutomationConditions>().notNull().default({}),
    actions: jsonb('actions').$type<AutomationActions>().notNull().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    active: boolean('active').notNull().default(true),
  },
  (table) => ({
    accountIdIdx: index('index_automation_rules_on_account_id').on(table.accountId),
  }),
);

export const macros = pgTable(
  'macros',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    name: varchar('name').notNull(),
    /** Enum: { personal: 0, global: 1 } */
    visibility: integer('visibility').default(0),
    createdById: bigint('created_by_id', { mode: 'bigint' }),
    updatedById: bigint('updated_by_id', { mode: 'bigint' }),
    actions: jsonb('actions').$type<MacroActions>().notNull().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_macros_on_account_id').on(table.accountId),
  }),
);

export const assignmentPolicies = pgTable(
  'assignment_policies',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    /** Enum: { round_robin: 0 } (extended in enterprise) */
    assignmentOrder: integer('assignment_order').notNull().default(0),
    /** Enum: { earliest_created: 0, longest_waiting: 1 } */
    conversationPriority: integer('conversation_priority').notNull().default(0),
    fairDistributionLimit: integer('fair_distribution_limit').notNull().default(100),
    fairDistributionWindow: integer('fair_distribution_window').notNull().default(3600),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountNameIdx: uniqueIndex('index_assignment_policies_on_account_id_and_name').on(
      table.accountId,
      table.name,
    ),
    accountIdIdx: index('index_assignment_policies_on_account_id').on(table.accountId),
    enabledIdx: index('index_assignment_policies_on_enabled').on(table.enabled),
  }),
);

export const agentCapacityPolicies = pgTable(
  'agent_capacity_policies',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    exclusionRules: jsonb('exclusion_rules').$type<AgentCapacityExclusionRules>().notNull().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_agent_capacity_policies_on_account_id').on(table.accountId),
  }),
);

export const inboxCapacityLimits = pgTable(
  'inbox_capacity_limits',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    agentCapacityPolicyId: bigint('agent_capacity_policy_id', { mode: 'bigint' }).notNull(),
    inboxId: bigint('inbox_id', { mode: 'bigint' }).notNull(),
    conversationLimit: integer('conversation_limit').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    policyInboxIdx: uniqueIndex('idx_on_agent_capacity_policy_id_inbox_id_71c7ec4caf').on(
      table.agentCapacityPolicyId,
      table.inboxId,
    ),
    policyIdIdx: index('index_inbox_capacity_limits_on_agent_capacity_policy_id').on(
      table.agentCapacityPolicyId,
    ),
    inboxIdIdx: index('index_inbox_capacity_limits_on_inbox_id').on(table.inboxId),
  }),
);
