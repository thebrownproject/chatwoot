import { relations, sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const roleEnum = pgEnum('role', ['admin', 'agent', 'contact', 'bot']);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    capabilities: text('capabilities').array().notNull().default([]),
  },
  (table) => [uniqueIndex('idx_permissions_user_id').on(table.userId)],
);

export const permissionsRelations = relations(permissions, ({ one }) => ({
  user: one(users, {
    fields: [permissions.userId],
    references: [users.id],
  }),
}));
