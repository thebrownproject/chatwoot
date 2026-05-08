import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const cannedResponses = pgTable('canned_responses', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  body: text('body').notNull(),
  bodyHtml: text('body_html'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const cannedResponsesRelations = relations(
  cannedResponses,
  ({ one }) => ({
    creator: one(users, {
      fields: [cannedResponses.createdBy],
      references: [users.id],
      relationName: 'createdResponses',
    }),
  }),
);
