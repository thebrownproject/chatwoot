import { relations, sql } from 'drizzle-orm';
import { pgEnum, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const teamRoleEnum = pgEnum('team_role', ['lead', 'member']);

export const teams = pgTable('teams', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
});

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: teamRoleEnum('role').notNull().default('member'),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

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
