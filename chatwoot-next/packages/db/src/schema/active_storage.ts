import {
  bigint,
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const activeStorageBlobs = pgTable(
  'active_storage_blobs',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    key: varchar('key').notNull(),
    filename: varchar('filename').notNull(),
    contentType: varchar('content_type'),
    metadata: text('metadata'),
    byteSize: bigint('byte_size', { mode: 'bigint' }).notNull(),
    checksum: varchar('checksum'),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    serviceName: varchar('service_name').notNull(),
  },
  (table) => ({
    keyIdx: uniqueIndex('index_active_storage_blobs_on_key').on(table.key),
  }),
);

export const activeStorageAttachments = pgTable(
  'active_storage_attachments',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name').notNull(),
    recordType: varchar('record_type').notNull(),
    recordId: bigint('record_id', { mode: 'bigint' }).notNull(),
    blobId: bigint('blob_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
  },
  (table) => ({
    blobIdIdx: index('index_active_storage_attachments_on_blob_id').on(table.blobId),
    uniquenessIdx: uniqueIndex('index_active_storage_attachments_uniqueness').on(
      table.recordType,
      table.recordId,
      table.name,
      table.blobId,
    ),
  }),
);

export const activeStorageVariantRecords = pgTable(
  'active_storage_variant_records',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    blobId: bigint('blob_id', { mode: 'bigint' }).notNull(),
    variationDigest: varchar('variation_digest').notNull(),
  },
  (table) => ({
    uniquenessIdx: uniqueIndex('index_active_storage_variant_records_uniqueness').on(
      table.blobId,
      table.variationDigest,
    ),
  }),
);

// Rails-managed: action_mailbox_inbound_emails
export const actionMailboxInboundEmails = pgTable(
  'action_mailbox_inbound_emails',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    /** Enum: pending: 0, processing: 1, delivered: 2, failed: 3, bounced: 4 (per ActionMailbox). */
    status: bigserial('status', { mode: 'bigint' }).notNull(),
    messageId: varchar('message_id').notNull(),
    messageChecksum: varchar('message_checksum').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    uniquenessIdx: uniqueIndex('index_action_mailbox_inbound_emails_uniqueness').on(
      table.messageId,
      table.messageChecksum,
    ),
  }),
);
