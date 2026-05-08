import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import type {
  ChannelAdditionalAttributes,
  ChannelContentTemplates,
  ChannelMessageTemplates,
  ChannelProviderConfig,
  WebWidgetPreChatFormOptions,
} from './types.js';

export const channelApi = pgTable(
  'channel_api',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    webhookUrl: varchar('webhook_url'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    identifier: varchar('identifier'),
    hmacToken: varchar('hmac_token'),
    hmacMandatory: boolean('hmac_mandatory').default(false),
    additionalAttributes: jsonb('additional_attributes').$type<ChannelAdditionalAttributes>().default({}),
    secret: varchar('secret'),
  },
  (table) => ({
    hmacTokenIdx: uniqueIndex('index_channel_api_on_hmac_token').on(table.hmacToken),
    identifierIdx: uniqueIndex('index_channel_api_on_identifier').on(table.identifier),
  }),
);

export const channelEmail = pgTable(
  'channel_email',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    email: varchar('email').notNull(),
    forwardToEmail: varchar('forward_to_email').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    imapEnabled: boolean('imap_enabled').default(false),
    imapAddress: varchar('imap_address').default(''),
    imapPort: integer('imap_port').default(0),
    imapLogin: varchar('imap_login').default(''),
    imapPassword: varchar('imap_password').default(''),
    imapEnableSsl: boolean('imap_enable_ssl').default(true),
    smtpEnabled: boolean('smtp_enabled').default(false),
    smtpAddress: varchar('smtp_address').default(''),
    smtpPort: integer('smtp_port').default(0),
    smtpLogin: varchar('smtp_login').default(''),
    smtpPassword: varchar('smtp_password').default(''),
    smtpDomain: varchar('smtp_domain').default(''),
    smtpEnableStarttlsAuto: boolean('smtp_enable_starttls_auto').default(true),
    smtpAuthentication: varchar('smtp_authentication').default('login'),
    smtpOpensslVerifyMode: varchar('smtp_openssl_verify_mode').default('none'),
    smtpEnableSslTls: boolean('smtp_enable_ssl_tls').default(false),
    providerConfig: jsonb('provider_config').$type<ChannelProviderConfig>().default({}),
    provider: varchar('provider'),
    verifiedForSending: boolean('verified_for_sending').notNull().default(false),
  },
  (table) => ({
    emailIdx: uniqueIndex('index_channel_email_on_email').on(table.email),
    forwardToEmailIdx: uniqueIndex('index_channel_email_on_forward_to_email').on(table.forwardToEmail),
  }),
);

export const channelFacebookPages = pgTable(
  'channel_facebook_pages',
  {
    id: serial('id').primaryKey(),
    pageId: varchar('page_id').notNull(),
    userAccessToken: varchar('user_access_token').notNull(),
    pageAccessToken: varchar('page_access_token').notNull(),
    accountId: integer('account_id').notNull(),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    instagramId: varchar('instagram_id'),
  },
  (table) => ({
    pageAccountIdx: uniqueIndex('index_channel_facebook_pages_on_page_id_and_account_id').on(
      table.pageId,
      table.accountId,
    ),
    pageIdIdx: index('index_channel_facebook_pages_on_page_id').on(table.pageId),
  }),
);

export const channelInstagram = pgTable(
  'channel_instagram',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accessToken: varchar('access_token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    accountId: integer('account_id').notNull(),
    instagramId: varchar('instagram_id').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    instagramIdIdx: uniqueIndex('index_channel_instagram_on_instagram_id').on(table.instagramId),
  }),
);

export const channelLine = pgTable(
  'channel_line',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    lineChannelId: varchar('line_channel_id').notNull(),
    lineChannelSecret: varchar('line_channel_secret').notNull(),
    lineChannelToken: varchar('line_channel_token').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    lineChannelIdIdx: uniqueIndex('index_channel_line_on_line_channel_id').on(table.lineChannelId),
  }),
);

export const channelSms = pgTable(
  'channel_sms',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    phoneNumber: varchar('phone_number').notNull(),
    provider: varchar('provider').default('default'),
    providerConfig: jsonb('provider_config').$type<ChannelProviderConfig>().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    phoneNumberIdx: uniqueIndex('index_channel_sms_on_phone_number').on(table.phoneNumber),
  }),
);

export const channelTelegram = pgTable(
  'channel_telegram',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    botName: varchar('bot_name'),
    accountId: integer('account_id').notNull(),
    botToken: varchar('bot_token').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    botTokenIdx: uniqueIndex('index_channel_telegram_on_bot_token').on(table.botToken),
  }),
);

export const channelTiktok = pgTable(
  'channel_tiktok',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    businessId: varchar('business_id').notNull(),
    accessToken: varchar('access_token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    refreshToken: varchar('refresh_token').notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    businessIdIdx: uniqueIndex('index_channel_tiktok_on_business_id').on(table.businessId),
  }),
);

export const channelTwilioSms = pgTable(
  'channel_twilio_sms',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    phoneNumber: varchar('phone_number'),
    authToken: varchar('auth_token').notNull(),
    accountSid: varchar('account_sid').notNull(),
    accountId: integer('account_id').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    medium: integer('medium').default(0),
    messagingServiceSid: varchar('messaging_service_sid'),
    apiKeySid: varchar('api_key_sid'),
    contentTemplates: jsonb('content_templates').$type<ChannelContentTemplates>().default({}),
    contentTemplatesLastUpdated: timestamp('content_templates_last_updated'),
    voiceEnabled: boolean('voice_enabled').notNull().default(false),
    twimlAppSid: varchar('twiml_app_sid'),
    apiKeySecret: varchar('api_key_secret'),
  },
  (table) => ({
    accountSidPhoneIdx: uniqueIndex('index_channel_twilio_sms_on_account_sid_and_phone_number').on(
      table.accountSid,
      table.phoneNumber,
    ),
    messagingServiceSidIdx: uniqueIndex('index_channel_twilio_sms_on_messaging_service_sid').on(
      table.messagingServiceSid,
    ),
    phoneNumberIdx: uniqueIndex('index_channel_twilio_sms_on_phone_number').on(table.phoneNumber),
  }),
);

export const channelTwitterProfiles = pgTable(
  'channel_twitter_profiles',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    profileId: varchar('profile_id').notNull(),
    twitterAccessToken: varchar('twitter_access_token').notNull(),
    twitterAccessTokenSecret: varchar('twitter_access_token_secret').notNull(),
    accountId: integer('account_id').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    tweetsEnabled: boolean('tweets_enabled').default(true),
  },
  (table) => ({
    accountProfileIdx: uniqueIndex('index_channel_twitter_profiles_on_account_id_and_profile_id').on(
      table.accountId,
      table.profileId,
    ),
  }),
);

export const channelWebWidgets = pgTable(
  'channel_web_widgets',
  {
    id: serial('id').primaryKey(),
    websiteUrl: varchar('website_url'),
    accountId: integer('account_id'),
    createdAt: timestamp('created_at', { precision: 6 }).notNull(),
    updatedAt: timestamp('updated_at', { precision: 6 }).notNull(),
    websiteToken: varchar('website_token'),
    widgetColor: varchar('widget_color').default('#1f93ff'),
    welcomeTitle: varchar('welcome_title'),
    welcomeTagline: varchar('welcome_tagline'),
    featureFlags: integer('feature_flags').notNull().default(7),
    replyTime: integer('reply_time').default(0),
    hmacToken: varchar('hmac_token'),
    preChatFormEnabled: boolean('pre_chat_form_enabled').default(false),
    preChatFormOptions: jsonb('pre_chat_form_options').$type<WebWidgetPreChatFormOptions>().default({}),
    hmacMandatory: boolean('hmac_mandatory').default(false),
    continuityViaEmail: boolean('continuity_via_email').notNull().default(true),
    allowedDomains: text('allowed_domains').default(''),
  },
  (table) => ({
    hmacTokenIdx: uniqueIndex('index_channel_web_widgets_on_hmac_token').on(table.hmacToken),
    websiteTokenIdx: uniqueIndex('index_channel_web_widgets_on_website_token').on(table.websiteToken),
  }),
);

export const channelWhatsapp = pgTable(
  'channel_whatsapp',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    accountId: integer('account_id').notNull(),
    phoneNumber: varchar('phone_number').notNull(),
    provider: varchar('provider').default('default'),
    providerConfig: jsonb('provider_config').$type<ChannelProviderConfig>().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    messageTemplates: jsonb('message_templates').$type<ChannelMessageTemplates>().default({}),
    messageTemplatesLastUpdated: timestamp('message_templates_last_updated', { precision: 6 }),
  },
  (table) => ({
    phoneNumberIdx: uniqueIndex('index_channel_whatsapp_on_phone_number').on(table.phoneNumber),
  }),
);
