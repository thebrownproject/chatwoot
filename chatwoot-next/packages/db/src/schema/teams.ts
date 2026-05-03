import {
  bigint,
  bigserial,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const teams = pgTable(
  'teams',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name').notNull(),
    description: text('description'),
    allowAutoAssign: boolean('allow_auto_assign').default(true),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_teams_on_account_id').on(table.accountId),
    nameAccountIdx: uniqueIndex('index_teams_on_name_and_account_id').on(table.name, table.accountId),
  }),
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    teamId: bigint('team_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    teamUserIdx: uniqueIndex('index_team_members_on_team_id_and_user_id').on(
      table.teamId,
      table.userId,
    ),
    teamIdIdx: index('index_team_members_on_team_id').on(table.teamId),
    userIdIdx: index('index_team_members_on_user_id').on(table.userId),
  }),
);
