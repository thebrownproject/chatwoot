// Phase 1 read-only port of Rails `Api::V1::Accounts::InboxesController#index`
// and `#show` (`app/controllers/api/v1/accounts/inboxes_controller.rb`,
// `app/views/api/v1/models/_inbox.json.jbuilder`).
//
// Drizzle: lists inboxes for an account, applies the `InboxPolicy::Scope`
// (`app/policies/inbox_policy.rb` -> `user.assigned_inboxes`,
// `app/models/user.rb#assigned_inboxes`), then batches the channel rows by
// channel_type via STI lookups in `packages/db/src/schema/channels.ts` and
// projects each inbox + channel into a Jbuilder-equivalent DTO.
import { and, eq, inArray, asc, type SQL } from 'drizzle-orm';
import {
  accountUsers,
  channelApi,
  channelEmail,
  channelFacebookPages,
  channelInstagram,
  channelLine,
  channelSms,
  channelTelegram,
  channelTiktok,
  channelTwilioSms,
  channelTwitterProfiles,
  channelWebWidgets,
  channelWhatsapp,
  inboxes,
  inboxMembers,
} from '@chatwoot-next/db';
import { db } from '@/lib/db';

// Mirrors `app/models/account_user.rb` enum: { agent: 0, administrator: 1 }.
const ROLE_ADMINISTRATOR = 1;

export type InboxRow = typeof inboxes.$inferSelect;

// Channel-specific projections live next to the inbox-level fields per the
// Rails Jbuilder, which spreads everything onto the inbox object rather than
// nesting a `channel: {...}` payload.
export type InboxDto = {
  id: string;
  channel_id: number;
  name: string;
  channel_type: string | null;
  greeting_enabled: boolean | null;
  greeting_message: string | null;
  working_hours_enabled: boolean | null;
  enable_email_collect: boolean | null;
  csat_survey_enabled: boolean | null;
  csat_config: Record<string, unknown>;
  enable_auto_assignment: boolean | null;
  auto_assignment_config: Record<string, unknown> | null;
  out_of_office_message: string | null;
  timezone: string | null;
  allow_messages_after_resolved: boolean | null;
  lock_to_single_conversation: boolean;
  sender_name_type: number;
  business_name: string | null;
  // Channel-specific fields are spread on top of the base shape.
  [extraKey: string]: unknown;
};

export type InboxListResult = { payload: InboxDto[] };

export type InboxListParams = {
  accountId: bigint;
  userId: bigint;
};

export type InboxShowParams = {
  accountId: bigint;
  userId: bigint;
  inboxId: bigint;
};

export class InboxNotFoundError extends Error {
  constructor() {
    super('Inbox not found');
    this.name = 'InboxNotFoundError';
  }
}

type ChannelTable =
  | typeof channelApi
  | typeof channelEmail
  | typeof channelFacebookPages
  | typeof channelInstagram
  | typeof channelLine
  | typeof channelSms
  | typeof channelTelegram
  | typeof channelTiktok
  | typeof channelTwilioSms
  | typeof channelTwitterProfiles
  | typeof channelWebWidgets
  | typeof channelWhatsapp;

// STI lookup table — mirrors `Channel::*` constants referenced from
// `app/models/inbox.rb` (`api?`, `email?`, `web_widget?`, etc.).
const CHANNEL_TABLES: Record<string, ChannelTable> = {
  'Channel::Api': channelApi,
  'Channel::Email': channelEmail,
  'Channel::FacebookPage': channelFacebookPages,
  'Channel::Instagram': channelInstagram,
  'Channel::Line': channelLine,
  'Channel::Sms': channelSms,
  'Channel::Telegram': channelTelegram,
  'Channel::Tiktok': channelTiktok,
  'Channel::TwilioSms': channelTwilioSms,
  'Channel::TwitterProfile': channelTwitterProfiles,
  'Channel::WebWidget': channelWebWidgets,
  'Channel::Whatsapp': channelWhatsapp,
};

type AnyChannelRow = Record<string, unknown> & { id: number | bigint };

// Indexed as `channelsByTypeAndId[channelType][channelId]`.
type ChannelIndex = Map<string, Map<string, AnyChannelRow>>;

async function loadAccountUserRole(
  client: typeof db,
  accountId: bigint,
  userId: bigint,
): Promise<number | null> {
  const [row] = await client
    .select({ role: accountUsers.role })
    .from(accountUsers)
    .where(
      and(
        eq(accountUsers.accountId, accountId),
        eq(accountUsers.userId, userId),
      )!,
    )
    .limit(1);
  return row?.role ?? null;
}

async function loadInboxIdsForAgent(
  client: typeof db,
  accountId: bigint,
  userId: bigint,
): Promise<number[]> {
  // inbox_members.inbox_id is integer; restrict to inboxes in this account.
  const rows = await client
    .select({ inboxId: inboxMembers.inboxId })
    .from(inboxMembers)
    .innerJoin(inboxes, eq(inboxes.id, inboxMembers.inboxId))
    .where(
      and(
        eq(inboxMembers.userId, Number(userId)),
        eq(inboxes.accountId, Number(accountId)),
      )!,
    );
  return rows.map((r) => r.inboxId);
}

async function loadChannelsByType(
  client: typeof db,
  inboxRows: InboxRow[],
): Promise<ChannelIndex> {
  const grouped = new Map<string, Set<number>>();
  for (const row of inboxRows) {
    const type = row.channelType;
    if (!type) continue;
    const ids = grouped.get(type) ?? new Set<number>();
    ids.add(row.channelId);
    grouped.set(type, ids);
  }

  const index: ChannelIndex = new Map();
  for (const [type, ids] of grouped) {
    const table = CHANNEL_TABLES[type];
    if (!table) continue;
    const idList = Array.from(ids);
    const rows = (await client
      .select()
      .from(table)
      // All channel tables expose a numeric/bigserial `id` column.
      .where(inArray((table as unknown as { id: ChannelTable['id'] }).id, idList))) as AnyChannelRow[];
    const byId = new Map<string, AnyChannelRow>();
    for (const channelRow of rows) {
      byId.set(String(channelRow.id), channelRow);
    }
    index.set(type, byId);
  }
  return index;
}

function baseInboxDto(row: InboxRow): InboxDto {
  return {
    id: String(row.id),
    channel_id: row.channelId,
    name: row.name,
    channel_type: row.channelType,
    greeting_enabled: row.greetingEnabled,
    greeting_message: row.greetingMessage,
    working_hours_enabled: row.workingHoursEnabled,
    enable_email_collect: row.enableEmailCollect,
    csat_survey_enabled: row.csatSurveyEnabled,
    csat_config: row.csatConfig ?? {},
    enable_auto_assignment: row.enableAutoAssignment,
    auto_assignment_config: row.autoAssignmentConfig ?? {},
    out_of_office_message: row.outOfOfficeMessage,
    timezone: row.timezone,
    allow_messages_after_resolved: row.allowMessagesAfterResolved,
    lock_to_single_conversation: row.lockToSingleConversation,
    sender_name_type: row.senderNameType,
    business_name: row.businessName,
  };
}

// Per-channel-type spread mirrors `app/views/api/v1/models/_inbox.json.jbuilder`.
// `isAdministrator` mirrors the `Current.account_user&.administrator?` guards
// the Jbuilder uses to mask sensitive credentials (HMAC tokens, IMAP/SMTP
// secrets, WhatsApp provider config, Twilio auth tokens, etc.).
function spreadChannel(
  dto: InboxDto,
  channelType: string | null,
  channel: AnyChannelRow | undefined,
  isAdministrator: boolean,
): InboxDto {
  if (!channelType || !channel) return dto;

  // `provider` is set on the inbox top-level whenever the channel exposes one,
  // matching the unconditional `json.provider resource.channel.try(:provider)`
  // line in the Jbuilder.
  if ('provider' in channel) {
    dto.provider = (channel as { provider?: unknown }).provider ?? null;
  }

  switch (channelType) {
    case 'Channel::Api': {
      const c = channel as typeof channelApi.$inferSelect;
      dto.webhook_url = c.webhookUrl;
      dto.inbox_identifier = c.identifier;
      dto.additional_attributes = c.additionalAttributes ?? {};
      if (isAdministrator) {
        dto.hmac_token = c.hmacToken;
        dto.secret = c.secret;
      }
      dto.hmac_mandatory = c.hmacMandatory;
      break;
    }
    case 'Channel::Email': {
      const c = channel as typeof channelEmail.$inferSelect;
      dto.email = c.email;
      const forwardingDomain = process.env.MAILER_INBOUND_EMAIL_DOMAIN ?? '';
      dto.forwarding_enabled = forwardingDomain.length > 0;
      if (forwardingDomain.length > 0) {
        dto.forward_to_email = c.forwardToEmail;
      }
      if (isAdministrator) {
        dto.imap_login = c.imapLogin;
        dto.imap_password = c.imapPassword;
        dto.imap_address = c.imapAddress;
        dto.imap_port = c.imapPort;
        dto.imap_enabled = c.imapEnabled;
        dto.imap_enable_ssl = c.imapEnableSsl;
        dto.smtp_login = c.smtpLogin;
        dto.smtp_password = c.smtpPassword;
        dto.smtp_address = c.smtpAddress;
        dto.smtp_port = c.smtpPort;
        dto.smtp_enabled = c.smtpEnabled;
        dto.smtp_domain = c.smtpDomain;
        dto.smtp_enable_ssl_tls = c.smtpEnableSslTls;
        dto.smtp_enable_starttls_auto = c.smtpEnableStarttlsAuto;
        dto.smtp_openssl_verify_mode = c.smtpOpensslVerifyMode;
        dto.smtp_authentication = c.smtpAuthentication;
      }
      break;
    }
    case 'Channel::FacebookPage': {
      const c = channel as typeof channelFacebookPages.$inferSelect;
      dto.page_id = c.pageId;
      // reauthorization_required is computed in Rails (`Channel::FacebookPage`);
      // TODO: port the OAuth token-validity heuristic.
      break;
    }
    case 'Channel::Instagram': {
      const c = channel as typeof channelInstagram.$inferSelect;
      dto.instagram_id = c.instagramId;
      // TODO: port `reauthorization_required?` from `Channel::Instagram`.
      break;
    }
    case 'Channel::Line': {
      // Line exposes no public attrs in the Jbuilder beyond the base inbox.
      break;
    }
    case 'Channel::Sms': {
      const c = channel as typeof channelSms.$inferSelect;
      dto.phone_number = c.phoneNumber;
      break;
    }
    case 'Channel::Telegram': {
      const c = channel as typeof channelTelegram.$inferSelect;
      dto.bot_name = c.botName;
      break;
    }
    case 'Channel::Tiktok': {
      // TODO: port `reauthorization_required?` from `Channel::Tiktok`.
      break;
    }
    case 'Channel::TwilioSms': {
      const c = channel as typeof channelTwilioSms.$inferSelect;
      dto.messaging_service_sid = c.messagingServiceSid;
      dto.phone_number = c.phoneNumber;
      dto.medium = c.medium;
      dto.content_templates = c.contentTemplates ?? {};
      if (isAdministrator) {
        dto.auth_token = c.authToken;
        dto.account_sid = c.accountSid;
        dto.api_key_sid = c.apiKeySid;
      }
      // Voice attributes (Jbuilder lines 136–144).
      dto.voice_enabled = c.voiceEnabled;
      dto.voice_configured = !!c.twimlAppSid;
      dto.has_api_key_secret = !!c.apiKeySecret;
      // TODO: port `voice_call_webhook_url` / `voice_status_webhook_url`
      // helpers from `Channel::TwilioSms` once the URL builder lands.
      break;
    }
    case 'Channel::TwitterProfile': {
      const c = channel as typeof channelTwitterProfiles.$inferSelect;
      dto.tweets_enabled = c.tweetsEnabled;
      break;
    }
    case 'Channel::WebWidget': {
      const c = channel as typeof channelWebWidgets.$inferSelect;
      dto.allowed_domains = c.allowedDomains;
      dto.widget_color = c.widgetColor;
      dto.website_url = c.websiteUrl;
      dto.hmac_mandatory = c.hmacMandatory;
      dto.welcome_title = c.welcomeTitle;
      dto.welcome_tagline = c.welcomeTagline;
      dto.website_token = c.websiteToken;
      dto.reply_time = c.replyTime;
      // TODO: port `web_widget_script` and `selected_feature_flags` from
      // `Channel::WebWidget` once those view helpers are ported.
      dto.pre_chat_form_enabled = c.preChatFormEnabled;
      dto.pre_chat_form_options = c.preChatFormOptions ?? {};
      dto.continuity_via_email = c.continuityViaEmail;
      if (isAdministrator) {
        dto.hmac_token = c.hmacToken;
      }
      break;
    }
    case 'Channel::Whatsapp': {
      const c = channel as typeof channelWhatsapp.$inferSelect;
      dto.phone_number = c.phoneNumber;
      dto.message_templates = c.messageTemplates ?? {};
      if (isAdministrator) {
        // Rails sends the full provider_config to administrators only — see
        // Jbuilder line 131 — so credentials stay scoped to admins.
        dto.provider_config = c.providerConfig ?? {};
      }
      // TODO: port `reauthorization_required?` from `Channel::Whatsapp`.
      break;
    }
    default:
      break;
  }
  return dto;
}

function toInboxDto(
  inboxRow: InboxRow,
  channels: ChannelIndex,
  isAdministrator: boolean,
): InboxDto {
  const dto = baseInboxDto(inboxRow);
  const byId = inboxRow.channelType ? channels.get(inboxRow.channelType) : undefined;
  const channelRow = byId?.get(String(inboxRow.channelId));
  return spreadChannel(dto, inboxRow.channelType, channelRow, isAdministrator);
}

function buildAccountWhere(accountId: bigint): SQL {
  return eq(inboxes.accountId, Number(accountId));
}

export async function listInboxes(
  params: InboxListParams,
  client: typeof db = db,
): Promise<InboxListResult> {
  const role = await loadAccountUserRole(client, params.accountId, params.userId);
  const isAdministrator = role === ROLE_ADMINISTRATOR;

  let where: SQL = buildAccountWhere(params.accountId);
  if (!isAdministrator) {
    const memberInboxIds = await loadInboxIdsForAgent(
      client,
      params.accountId,
      params.userId,
    );
    if (memberInboxIds.length === 0) {
      return { payload: [] };
    }
    where = and(where, inArray(inboxes.id, memberInboxIds))!;
  }

  // Rails uses `order_by_name` (LOWER(name) ASC) — close enough with `asc(name)`
  // until a case-insensitive collation predicate is needed.
  const inboxRows = await client.select().from(inboxes).where(where).orderBy(asc(inboxes.name));
  const channels = await loadChannelsByType(client, inboxRows);
  const payload = inboxRows.map((row) => toInboxDto(row, channels, isAdministrator));
  return { payload };
}

export async function getInbox(
  params: InboxShowParams,
  client: typeof db = db,
): Promise<InboxDto> {
  const role = await loadAccountUserRole(client, params.accountId, params.userId);
  const isAdministrator = role === ROLE_ADMINISTRATOR;

  const [inboxRow] = await client
    .select()
    .from(inboxes)
    .where(
      and(
        eq(inboxes.id, Number(params.inboxId)),
        eq(inboxes.accountId, Number(params.accountId)),
      )!,
    )
    .limit(1);

  if (!inboxRow) throw new InboxNotFoundError();

  if (!isAdministrator) {
    // Mirrors `InboxPolicy#show?` -> `assigned_inboxes.include? record`.
    const [member] = await client
      .select({ id: inboxMembers.id })
      .from(inboxMembers)
      .where(
        and(
          eq(inboxMembers.inboxId, Number(params.inboxId)),
          eq(inboxMembers.userId, Number(params.userId)),
        )!,
      )
      .limit(1);
    if (!member) throw new InboxNotFoundError();
  }

  const channels = await loadChannelsByType(client, [inboxRow]);
  return toInboxDto(inboxRow, channels, isAdministrator);
}
