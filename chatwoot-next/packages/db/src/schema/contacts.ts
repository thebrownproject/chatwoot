import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type {
  ContactAdditionalAttributes,
  ContactCustomAttributes,
  ConversationAdditionalAttributes,
  ConversationCustomAttributes,
  MessageAdditionalAttributes,
  MessageContentAttributes,
  MessageExternalSourceIds,
  MessageMeta,
  MessageSentiment,
} from './types.js';

/** Rails enum: { visitor: 0, lead: 1, customer: 2 } */
export type ContactType = 0 | 1 | 2;
/** Rails enum: { open: 0, resolved: 1, pending: 2, snoozed: 3 } */
export type ConversationStatus = 0 | 1 | 2 | 3;
/** Rails enum: { low: 0, medium: 1, high: 2, urgent: 3 } */
export type ConversationPriority = 0 | 1 | 2 | 3;
/** Rails enum: { incoming: 0, outgoing: 1, activity: 2, template: 3 } */
export type MessageType = 0 | 1 | 2 | 3;
/** Rails enum: { sent: 0, delivered: 1, read: 2, failed: 3 } */
export type MessageStatus = 0 | 1 | 2 | 3;
/**
 * Rails enum (`app/models/message.rb`):
 *   text: 0, input_text: 1, input_textarea: 2, input_email: 3, input_select: 4,
 *   cards: 5, form: 6, article: 7, incoming_email: 8, input_csat: 9,
 *   integrations: 10, sticker: 11
 */
export type MessageContentType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
/**
 * Rails enum (`app/models/attachment.rb`): image: 0, audio: 1, video: 2, file: 3,
 * location: 4, fallback: 5, share: 6, story_mention: 7, contact: 8, ig_reel: 9, audio_record: 10
 */
export type AttachmentFileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const contacts = pgTable(
  'contacts',
  {
    // Rails: `id: :serial`
    id: serial('id').primaryKey(),
    name: varchar('name').default(''),
    email: varchar('email'),
    phoneNumber: varchar('phone_number'),
    accountId: integer('account_id').notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    additionalAttributes: jsonb('additional_attributes').$type<ContactAdditionalAttributes>().default({}),
    identifier: varchar('identifier'),
    customAttributes: jsonb('custom_attributes').$type<ContactCustomAttributes>().default({}),
    lastActivityAt: timestamp('last_activity_at', { precision: 6 }),
    /** Enum: { visitor: 0, lead: 1, customer: 2 } */
    contactType: integer('contact_type').$type<ContactType>().default(0),
    middleName: varchar('middle_name').default(''),
    lastName: varchar('last_name').default(''),
    location: varchar('location').default(''),
    countryCode: varchar('country_code').default(''),
    blocked: boolean('blocked').notNull().default(false),
    companyId: bigint('company_id', { mode: 'bigint' }),
  },
  (table) => ({
    accountContactTypeIdx: index('index_contacts_on_account_id_and_contact_type').on(
      table.accountId,
      table.contactType,
    ),
    accountLastActivityIdx: index('index_contacts_on_account_id_and_last_activity_at').on(
      table.accountId,
      table.lastActivityAt,
    ),
    accountIdIdx: index('index_contacts_on_account_id').on(table.accountId),
    blockedIdx: index('index_contacts_on_blocked').on(table.blocked),
    companyIdIdx: index('index_contacts_on_company_id').on(table.companyId),
    emailAccountIdx: uniqueIndex('uniq_email_per_account_contact').on(table.email, table.accountId),
    identifierAccountIdx: uniqueIndex('uniq_identifier_per_account_contact').on(
      table.identifier,
      table.accountId,
    ),
    phoneAccountIdx: index('index_contacts_on_phone_number_and_account_id').on(
      table.phoneNumber,
      table.accountId,
    ),
  }),
);

export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),
    accountId: integer('account_id').notNull(),
    inboxId: integer('inbox_id').notNull(),
    /** Enum: { open: 0, resolved: 1, pending: 2, snoozed: 3 } */
    status: integer('status').$type<ConversationStatus>().notNull().default(0),
    assigneeId: integer('assignee_id'),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    contactId: bigint('contact_id', { mode: 'bigint' }),
    displayId: integer('display_id').notNull(),
    contactLastSeenAt: timestamp('contact_last_seen_at', { precision: 6 }),
    agentLastSeenAt: timestamp('agent_last_seen_at', { precision: 6 }),
    additionalAttributes: jsonb('additional_attributes').$type<ConversationAdditionalAttributes>().default({}),
    contactInboxId: bigint('contact_inbox_id', { mode: 'bigint' }),
    uuid: uuid('uuid').notNull().default(sql`gen_random_uuid()`),
    identifier: varchar('identifier'),
    lastActivityAt: timestamp('last_activity_at', { precision: 6 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    teamId: bigint('team_id', { mode: 'bigint' }),
    campaignId: bigint('campaign_id', { mode: 'bigint' }),
    snoozedUntil: timestamp('snoozed_until', { precision: 6 }),
    customAttributes: jsonb('custom_attributes').$type<ConversationCustomAttributes>().default({}),
    assigneeLastSeenAt: timestamp('assignee_last_seen_at', { precision: 6 }),
    firstReplyCreatedAt: timestamp('first_reply_created_at', { precision: 6 }),
    /** Enum: { low: 0, medium: 1, high: 2, urgent: 3 } */
    priority: integer('priority').$type<ConversationPriority>(),
    slaPolicyId: bigint('sla_policy_id', { mode: 'bigint' }),
    waitingSince: timestamp('waiting_since'),
    cachedLabelList: text('cached_label_list'),
    assigneeAgentBotId: bigint('assignee_agent_bot_id', { mode: 'bigint' }),
  },
  (table) => ({
    accountDisplayIdx: uniqueIndex('index_conversations_on_account_id_and_display_id').on(
      table.accountId,
      table.displayId,
    ),
    accountIdIdx: index('index_conversations_on_account_id').on(table.accountId),
    assigneeAccountIdx: index('index_conversations_on_assignee_id_and_account_id').on(
      table.assigneeId,
      table.accountId,
    ),
    campaignIdIdx: index('index_conversations_on_campaign_id').on(table.campaignId),
    contactIdIdx: index('index_conversations_on_contact_id').on(table.contactId),
    contactInboxIdIdx: index('index_conversations_on_contact_inbox_id').on(table.contactInboxId),
    firstReplyCreatedAtIdx: index('index_conversations_on_first_reply_created_at').on(
      table.firstReplyCreatedAt,
    ),
    inboxIdIdx: index('index_conversations_on_inbox_id').on(table.inboxId),
    priorityIdx: index('index_conversations_on_priority').on(table.priority),
    statusAccountIdx: index('index_conversations_on_status_and_account_id').on(
      table.status,
      table.accountId,
    ),
    statusPriorityIdx: index('index_conversations_on_status_and_priority').on(
      table.status,
      table.priority,
    ),
    teamIdIdx: index('index_conversations_on_team_id').on(table.teamId),
    uuidIdx: uniqueIndex('index_conversations_on_uuid').on(table.uuid),
    waitingSinceIdx: index('index_conversations_on_waiting_since').on(table.waitingSince),
  }),
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    conversationId: bigint('conversation_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_conversation_participants_on_account_id').on(table.accountId),
    conversationIdIdx: index('index_conversation_participants_on_conversation_id').on(
      table.conversationId,
    ),
    userConversationIdx: uniqueIndex(
      'index_conversation_participants_on_user_id_and_conversation_id',
    ).on(table.userId, table.conversationId),
    userIdIdx: index('index_conversation_participants_on_user_id').on(table.userId),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    content: text('content'),
    accountId: integer('account_id').notNull(),
    inboxId: integer('inbox_id').notNull(),
    conversationId: integer('conversation_id').notNull(),
    /** Enum: { incoming: 0, outgoing: 1, activity: 2, template: 3 } */
    messageType: integer('message_type').$type<MessageType>().notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    private: boolean('private').notNull().default(false),
    /** Enum: { sent: 0, delivered: 1, read: 2, failed: 3 } */
    status: integer('status').$type<MessageStatus>().default(0),
    sourceId: text('source_id'),
    /** See MessageContentType for enum values. */
    contentType: integer('content_type').$type<MessageContentType>().notNull().default(0),
    contentAttributes: json('content_attributes').$type<MessageContentAttributes>().default({}),
    senderType: varchar('sender_type'),
    senderId: bigint('sender_id', { mode: 'bigint' }),
    externalSourceIds: jsonb('external_source_ids').$type<MessageExternalSourceIds>().default({}),
    additionalAttributes: jsonb('additional_attributes').$type<MessageAdditionalAttributes>().default({}),
    processedMessageContent: text('processed_message_content'),
    sentiment: jsonb('sentiment').$type<MessageSentiment>().default({}),
  },
  (table) => ({
    accountContentCreatedIdx: index('idx_messages_account_content_created').on(
      table.accountId,
      table.contentType,
      table.createdAt,
    ),
    accountCreatedTypeIdx: index('index_messages_on_account_created_type').on(
      table.accountId,
      table.createdAt,
      table.messageType,
    ),
    accountInboxIdx: index('index_messages_on_account_id_and_inbox_id').on(
      table.accountId,
      table.inboxId,
    ),
    accountIdIdx: index('index_messages_on_account_id').on(table.accountId),
    convAccountTypeCreatedIdx: index('index_messages_on_conversation_account_type_created').on(
      table.conversationId,
      table.accountId,
      table.messageType,
      table.createdAt,
    ),
    conversationIdIdx: index('index_messages_on_conversation_id').on(table.conversationId),
    createdAtIdx: index('index_messages_on_created_at').on(table.createdAt),
    inboxIdIdx: index('index_messages_on_inbox_id').on(table.inboxId),
    senderIdx: index('index_messages_on_sender_type_and_sender_id').on(
      table.senderType,
      table.senderId,
    ),
    sourceIdIdx: index('index_messages_on_source_id').on(table.sourceId),
  }),
);

export const attachments = pgTable(
  'attachments',
  {
    id: serial('id').primaryKey(),
    /** Enum: see AttachmentFileType. */
    fileType: integer('file_type').$type<AttachmentFileType>().default(0),
    externalUrl: varchar('external_url'),
    coordinatesLat: doublePrecision('coordinates_lat').default(0.0),
    coordinatesLong: doublePrecision('coordinates_long').default(0.0),
    messageId: integer('message_id').notNull(),
    accountId: integer('account_id').notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    fallbackTitle: varchar('fallback_title'),
    extension: varchar('extension'),
    meta: jsonb('meta').$type<MessageMeta>().default({}),
  },
  (table) => ({
    accountIdIdx: index('index_attachments_on_account_id').on(table.accountId),
    messageIdIdx: index('index_attachments_on_message_id').on(table.messageId),
  }),
);

export const mentions = pgTable(
  'mentions',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    conversationId: bigint('conversation_id', { mode: 'bigint' }).notNull(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    mentionedAt: timestamp('mentioned_at', { precision: 6 }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_mentions_on_account_id').on(table.accountId),
    conversationIdIdx: index('index_mentions_on_conversation_id').on(table.conversationId),
    userConversationIdx: uniqueIndex('index_mentions_on_user_id_and_conversation_id').on(
      table.userId,
      table.conversationId,
    ),
    userIdIdx: index('index_mentions_on_user_id').on(table.userId),
  }),
);

export const notes = pgTable(
  'notes',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    content: text('content').notNull(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    contactId: bigint('contact_id', { mode: 'bigint' }).notNull(),
    userId: bigint('user_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    accountIdIdx: index('index_notes_on_account_id').on(table.accountId),
    contactIdIdx: index('index_notes_on_contact_id').on(table.contactId),
    userIdIdx: index('index_notes_on_user_id').on(table.userId),
  }),
);

export const csatSurveyResponses = pgTable(
  'csat_survey_responses',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    conversationId: bigint('conversation_id', { mode: 'bigint' }).notNull(),
    messageId: bigint('message_id', { mode: 'bigint' }).notNull(),
    rating: integer('rating').notNull(),
    feedbackMessage: text('feedback_message'),
    contactId: bigint('contact_id', { mode: 'bigint' }).notNull(),
    assignedAgentId: bigint('assigned_agent_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    csatReviewNotes: text('csat_review_notes'),
    reviewNotesUpdatedAt: timestamp('review_notes_updated_at'),
    reviewNotesUpdatedById: bigint('review_notes_updated_by_id', { mode: 'bigint' }),
  },
  (table) => ({
    accountIdIdx: index('index_csat_survey_responses_on_account_id').on(table.accountId),
    assignedAgentIdx: index('index_csat_survey_responses_on_assigned_agent_id').on(
      table.assignedAgentId,
    ),
    contactIdIdx: index('index_csat_survey_responses_on_contact_id').on(table.contactId),
    conversationIdIdx: index('index_csat_survey_responses_on_conversation_id').on(
      table.conversationId,
    ),
    messageIdIdx: uniqueIndex('index_csat_survey_responses_on_message_id').on(table.messageId),
    reviewNotesByIdx: index('index_csat_survey_responses_on_review_notes_updated_by_id').on(
      table.reviewNotesUpdatedById,
    ),
  }),
);

export const companies = pgTable(
  'companies',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name').notNull(),
    domain: varchar('domain'),
    description: text('description'),
    accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    contactsCount: integer('contacts_count'),
  },
  (table) => ({
    accountIdIdx: index('index_companies_on_account_id').on(table.accountId),
    nameAccountIdx: index('index_companies_on_name_and_account_id').on(table.name, table.accountId),
  }),
);
