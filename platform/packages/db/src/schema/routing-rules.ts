import { sql, relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tz } from './column-helpers.js';

export const routingActionEnum = pgEnum('routing_action', [
  'assign_agent',
  'assign_team',
  'assign_bot',
]);

export const routingTargetTypeEnum = pgEnum('routing_target_type', [
  'user',
  'team',
]);

export const routingRules = pgTable('routing_rules', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  priority: integer('priority').notNull(),
  conditions: jsonb('conditions').default({}),
  action: routingActionEnum('action').notNull(),
  targetType: routingTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const routingRulesRelations = relations(routingRules, () => ({}));
