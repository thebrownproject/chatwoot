import { relations, sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { tz } from './column-helpers.js';
import { users } from './users.js';

export const teamMemberRoleEnum = pgEnum('team_member_role', [
  'lead',
  'member',
]);

/** @deprecated Use teamMemberRoleEnum */
export const teamRoleEnum = teamMemberRoleEnum;

export const teams = pgTable('teams', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: teamMemberRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));
