import {
  bigint,
  bigserial,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const reportingEvents = pgTable(
  'reporting_events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name'),
    value: doublePrecision('value'),
    accountId: integer('account_id'),
    inboxId: integer('inbox_id'),
    userId: integer('user_id'),
    conversationId: integer('conversation_id'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    valueInBusinessHours: doublePrecision('value_in_business_hours'),
    eventStartTime: timestamp('event_start_time', { precision: 6 }),
    eventEndTime: timestamp('event_end_time', { precision: 6 }),
  },
  (table) => ({
    accountNameCreatedIdx: index('reporting_events__account_id__name__created_at').on(
      table.accountId,
      table.name,
      table.createdAt,
    ),
    accountNameInboxCreatedIdx: index('index_reporting_events_for_response_distribution').on(
      table.accountId,
      table.name,
      table.inboxId,
      table.createdAt,
    ),
    accountIdIdx: index('index_reporting_events_on_account_id').on(table.accountId),
    conversationIdIdx: index('index_reporting_events_on_conversation_id').on(table.conversationId),
    createdAtIdx: index('index_reporting_events_on_created_at').on(table.createdAt),
    inboxIdIdx: index('index_reporting_events_on_inbox_id').on(table.inboxId),
    nameIdx: index('index_reporting_events_on_name').on(table.name),
    userIdIdx: index('index_reporting_events_on_user_id').on(table.userId),
  }),
);

export const reportingEventsRollups = pgTable(
  'reporting_events_rollups',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    date: date('date').notNull(),
    /** Enum: account, agent, inbox, team */
    dimensionType: varchar('dimension_type').notNull(),
    dimensionId: bigint('dimension_id', { mode: 'bigint' }).notNull(),
    /** Rails enum METRIC list — see app/models/reporting_events_rollup.rb. */
    metric: varchar('metric').notNull(),
    count: bigint('count', { mode: 'bigint' }).notNull().default(0n),
    sumValue: doublePrecision('sum_value').notNull().default(0.0),
    sumValueBusinessHours: doublePrecision('sum_value_business_hours').notNull().default(0.0),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    rollupUniqueKey: uniqueIndex('index_rollup_unique_key').on(
      table.accountId,
      table.date,
      table.dimensionType,
      table.dimensionId,
      table.metric,
    ),
    rollupSummaryIdx: index('index_rollup_summary').on(
      table.accountId,
      table.dimensionType,
      table.date,
    ),
    rollupTimeseriesIdx: index('index_rollup_timeseries').on(
      table.accountId,
      table.metric,
      table.date,
    ),
  }),
);

export const dataImports = pgTable(
  'data_imports',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    dataType: varchar('data_type').notNull(),
    /** Enum: { pending: 0, processing: 1, completed: 2, failed: 3 } */
    status: integer('status').notNull().default(0),
    processingErrors: varchar('processing_errors'),
    totalRecords: integer('total_records'),
    processedRecords: integer('processed_records'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_data_imports_on_account_id').on(table.accountId),
  }),
);
