// Phase 1 read-only port of Rails `Api::V1::Accounts::ConversationsController#index`
// + `ConversationFinder` (`app/finders/conversation_finder.rb`,
// `app/views/api/v1/accounts/conversations/index.json.jbuilder`,
// `app/views/api/v1/conversations/partials/_conversation.json.jbuilder`).
//
// Drizzle: builds the WHERE/ORDER/LIMIT predicate from the
// `ConversationListParams` passed in by the route handler. The route is
// responsible for parsing `searchParams` into typed inputs.
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  contactInboxes,
  contacts,
  conversations,
  inboxes,
  messages,
  taggings,
  tags,
  teams,
  users,
} from '@chatwoot-next/db';

import { db } from '@/lib/db';

export const DEFAULT_PAGE_SIZE = 25;

// Rails enum (`app/models/conversation.rb`):
//   { open: 0, resolved: 1, pending: 2, snoozed: 3 }
const STATUS_TO_INT: Record<Exclude<ConversationStatus, 'all'>, 0 | 1 | 2 | 3> = {
  open: 0,
  resolved: 1,
  pending: 2,
  snoozed: 3,
};

export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed' | 'all';
export type AssigneeType = 'me' | 'unassigned' | 'assigned';

export type ConversationListParams = {
  accountId: bigint;
  userId: bigint;
  page?: number;
  pageSize?: number;
  status?: ConversationStatus;
  assigneeType?: AssigneeType;
  inboxId?: bigint;
  teamId?: bigint;
  labels?: string[];
  q?: string;
  updatedWithin?: number; // seconds
};

export type ConversationContactDto = {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  identifier: string | null;
  thumbnail: string;
  type: 'contact';
};

export type ConversationAssigneeDto = {
  id: string;
  name: string;
  available_name: string | null;
  avatar_url: string;
  type: 'user';
  availability_status: string;
  thumbnail: string;
};

export type ConversationInboxDto = {
  id: string;
  name: string;
  channel_type: string | null;
};

export type ConversationContactInboxDto = {
  id: string;
  contact_id: string | null;
  inbox_id: string | null;
  source_id: string;
  hmac_verified: boolean;
};

export type ConversationTeamDto = {
  id: string;
  name: string;
  description: string | null;
  allow_auto_assign: boolean;
  account_id: string;
};

export type ConversationDto = {
  id: number; // Rails serializes `display_id` (integer) as `id`
  uuid: string;
  account_id: number;
  inbox_id: number;
  status: ConversationStatus;
  assignee_last_seen_at: number;
  agent_last_seen_at: number;
  contact_last_seen_at: number;
  timestamp: number;
  created_at: number;
  updated_at: number;
  last_activity_at: number;
  first_reply_created_at: number;
  waiting_since: number;
  snoozed_until: Date | null;
  priority: number | null;
  sla_policy_id: string | null;
  custom_attributes: unknown;
  additional_attributes: unknown;
  labels: string[];
  unread_count: number;
  can_reply: boolean;
  muted: boolean;
  messages: unknown[];
  meta: {
    sender: ConversationContactDto | null;
    channel: string | null;
    assignee?: ConversationAssigneeDto | undefined;
    assignee_type?: 'User' | undefined;
    team?: ConversationTeamDto | undefined;
    hmac_verified: boolean;
  };
  contact_inbox: ConversationContactInboxDto | null;
};

export type ConversationListResult = {
  data: {
    meta: {
      mine_count: number;
      assigned_count: number;
      unassigned_count: number;
      all_count: number;
    };
    payload: ConversationDto[];
  };
};

const bigintToString = (b: bigint | number | null | undefined): string | null => {
  if (b === null || b === undefined) return null;
  return typeof b === 'bigint' ? b.toString() : String(b);
};

const toUnixSeconds = (d: Date | null | undefined): number => {
  if (!d) return 0;
  return Math.floor(d.getTime() / 1000);
};

const toUnixFloat = (d: Date | null | undefined): number => {
  if (!d) return 0;
  return d.getTime() / 1000;
};

const STATUS_INT_TO_STRING = ['open', 'resolved', 'pending', 'snoozed'] as const;

function buildBaseFilters(params: ConversationListParams): SQL {
  const filters: SQL[] = [eq(conversations.accountId, Number(params.accountId))];

  if (params.status && params.status !== 'all') {
    filters.push(eq(conversations.status, STATUS_TO_INT[params.status]));
  } else if (!params.status && !params.q) {
    // Rails `ConversationFinder#filter_by_status` defaults to `open` when no
    // `q` is provided and no explicit status is set.
    filters.push(eq(conversations.status, STATUS_TO_INT.open));
  }

  if (params.inboxId !== undefined) {
    filters.push(eq(conversations.inboxId, Number(params.inboxId)));
  }
  if (params.teamId !== undefined) {
    filters.push(eq(conversations.teamId, params.teamId));
  }
  if (params.updatedWithin && params.updatedWithin > 0) {
    const since = new Date(Date.now() - params.updatedWithin * 1000);
    filters.push(gte(conversations.updatedAt, since));
  }
  if (params.q?.trim()) {
    const needle = `%${params.q.trim()}%`;
    const search = or(
      ilike(contacts.name, needle),
      ilike(contacts.email, needle),
      ilike(sql`cast(${conversations.displayId} as text)`, needle),
    )!;
    filters.push(search);
  }
  if (params.labels && params.labels.length > 0) {
    // `acts_as_taggable_on` joins `taggings`/`tags` filtered by
    // `taggable_type = 'Conversation'` and `tags.name in (...)`.
    filters.push(
      sql`exists (
        select 1 from ${taggings}
        join ${tags} on ${tags.id} = ${taggings.tagId}
        where ${taggings.taggableType} = 'Conversation'
          and ${taggings.taggableId} = ${conversations.id}
          and ${tags.name} in ${params.labels}
      )`,
    );
  }
  return and(...filters)!;
}

function applyAssigneeFilter(base: SQL, params: ConversationListParams): SQL {
  if (!params.assigneeType) return base;
  switch (params.assigneeType) {
    case 'me':
      return and(base, eq(conversations.assigneeId, Number(params.userId)))!;
    case 'unassigned':
      return and(base, isNull(conversations.assigneeId))!;
    case 'assigned':
      return and(base, isNotNull(conversations.assigneeId))!;
    default:
      return base;
  }
}

type ConversationRow = typeof conversations.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type InboxRow = typeof inboxes.$inferSelect;
type UserRow = typeof users.$inferSelect;
type TeamRow = typeof teams.$inferSelect;
type ContactInboxRow = typeof contactInboxes.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

type JoinedRow = {
  conversation: ConversationRow;
  contact: ContactRow | null;
  inbox: InboxRow | null;
  assignee: UserRow | null;
  team: TeamRow | null;
  contactInbox: ContactInboxRow | null;
};

function toContactDto(c: ContactRow | null): ConversationContactDto | null {
  if (!c) return null;
  return {
    id: String(c.id),
    name: c.name,
    email: c.email,
    phone_number: c.phoneNumber,
    identifier: c.identifier,
    thumbnail: '',
    type: 'contact',
  };
}

function toAssigneeDto(u: UserRow | null): ConversationAssigneeDto | undefined {
  if (!u) return undefined;
  return {
    id: String(u.id),
    name: u.name,
    available_name: u.displayName ?? u.name,
    avatar_url: '',
    type: 'user',
    availability_status: ['online', 'offline', 'busy'][u.availability ?? 1] ?? 'offline',
    thumbnail: '',
  };
}

function toTeamDto(t: TeamRow | null): ConversationTeamDto | undefined {
  if (!t) return undefined;
  return {
    id: t.id.toString(),
    name: t.name,
    description: t.description,
    allow_auto_assign: t.allowAutoAssign ?? true,
    account_id: t.accountId.toString(),
  };
}

function toContactInboxDto(ci: ContactInboxRow | null): ConversationContactInboxDto | null {
  if (!ci) return null;
  return {
    id: ci.id.toString(),
    contact_id: bigintToString(ci.contactId),
    inbox_id: bigintToString(ci.inboxId),
    source_id: ci.sourceId,
    hmac_verified: ci.hmacVerified ?? false,
  };
}

function parseLabels(cached: string | null | undefined): string[] {
  if (!cached) return [];
  return cached.split(',').map((s) => s.trim()).filter(Boolean);
}

function toMessagePushEvent(m: MessageRow): Record<string, unknown> {
  // Mirrors a minimal subset of `Message#push_event_data` — full parity
  // requires the related sender/attachments which we omit in Phase 1.
  return {
    id: m.id,
    content: m.content,
    account_id: m.accountId,
    inbox_id: m.inboxId,
    conversation_id: m.conversationId,
    message_type: m.messageType,
    created_at: toUnixSeconds(m.createdAt),
    updated_at: toUnixFloat(m.updatedAt),
    private: m.private,
    status: m.status,
    source_id: m.sourceId,
    content_type: m.contentType,
    content_attributes: m.contentAttributes ?? {},
    sender_type: m.senderType,
    sender_id: m.senderId === null ? null : Number(m.senderId),
  };
}

function toConversationDto(row: JoinedRow, lastMessage: MessageRow | null): ConversationDto {
  const c = row.conversation;
  return {
    id: c.displayId,
    uuid: c.uuid,
    account_id: c.accountId,
    inbox_id: c.inboxId,
    status: STATUS_INT_TO_STRING[c.status] ?? 'open',
    assignee_last_seen_at: toUnixSeconds(c.assigneeLastSeenAt),
    agent_last_seen_at: toUnixSeconds(c.agentLastSeenAt),
    contact_last_seen_at: toUnixSeconds(c.contactLastSeenAt),
    timestamp: toUnixSeconds(c.lastActivityAt),
    created_at: toUnixSeconds(c.createdAt),
    updated_at: c.updatedAt.getTime() / 1000,
    last_activity_at: toUnixSeconds(c.lastActivityAt),
    first_reply_created_at: toUnixSeconds(c.firstReplyCreatedAt),
    waiting_since: toUnixSeconds(c.waitingSince),
    snoozed_until: c.snoozedUntil,
    priority: c.priority,
    sla_policy_id: bigintToString(c.slaPolicyId),
    custom_attributes: c.customAttributes ?? {},
    additional_attributes: c.additionalAttributes ?? {},
    labels: parseLabels(c.cachedLabelList),
    unread_count: 0,
    can_reply: true,
    muted: false,
    messages: lastMessage ? [toMessagePushEvent(lastMessage)] : [],
    meta: {
      sender: toContactDto(row.contact),
      channel: row.inbox?.channelType ?? null,
      ...(row.assignee ? { assignee: toAssigneeDto(row.assignee), assignee_type: 'User' as const } : {}),
      ...(row.team ? { team: toTeamDto(row.team) } : {}),
      hmac_verified: row.contactInbox?.hmacVerified ?? false,
    },
    contact_inbox: toContactInboxDto(row.contactInbox),
  };
}

export async function listConversations(
  params: ConversationListParams,
  client: typeof db = db,
): Promise<ConversationListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE);

  const baseFilter = buildBaseFilters(params);
  const filteredForList = applyAssigneeFilter(baseFilter, params);

  // Counts: Rails' ConversationFinder runs assignee/unassigned/all counts on
  // the post-status/labels/team-filtered set (i.e. `baseFilter`), then derives
  // `assigned_count = all_count - unassigned_count`. We mirror that here.
  const [mineCountRow, unassignedCountRow, allCountRow, listRows] = await Promise.all([
    client
      .select({ value: count() })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, sql`${conversations.contactId}::int`))
      .where(and(baseFilter, eq(conversations.assigneeId, Number(params.userId)))!),
    client
      .select({ value: count() })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, sql`${conversations.contactId}::int`))
      .where(and(baseFilter, isNull(conversations.assigneeId))!),
    client
      .select({ value: count() })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, sql`${conversations.contactId}::int`))
      .where(baseFilter),
    client
      .select({
        conversation: conversations,
        contact: contacts,
        inbox: inboxes,
        assignee: users,
        team: teams,
        contactInbox: contactInboxes,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, sql`${conversations.contactId}::int`))
      .leftJoin(inboxes, eq(inboxes.id, conversations.inboxId))
      .leftJoin(users, eq(users.id, conversations.assigneeId))
      .leftJoin(teams, eq(teams.id, conversations.teamId))
      .leftJoin(contactInboxes, eq(contactInboxes.id, conversations.contactInboxId))
      .where(filteredForList)
      .orderBy(desc(conversations.lastActivityAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const mineCount = Number(mineCountRow[0]?.value ?? 0);
  const unassignedCount = Number(unassignedCountRow[0]?.value ?? 0);
  const allCount = Number(allCountRow[0]?.value ?? 0);
  const assignedCount = allCount - unassignedCount;

  // Latest message per conversation (one query, then group).
  const conversationIds = (listRows as JoinedRow[]).map((r) => r.conversation.id);
  let latestByConversation = new Map<number, MessageRow>();
  if (conversationIds.length > 0) {
    const latestRows = await client
      .select()
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          eq(messages.accountId, Number(params.accountId)),
          // Latest message overall (no message_type filter, matching the
          // first jbuilder block: `messages.where(account_id: ...).last`).
        )!,
      )
      .orderBy(asc(messages.conversationId), desc(messages.createdAt));
    latestByConversation = new Map<number, MessageRow>();
    for (const m of latestRows) {
      if (!latestByConversation.has(m.conversationId)) {
        latestByConversation.set(m.conversationId, m);
      }
    }
  }

  const payload = (listRows as JoinedRow[]).map((row) =>
    toConversationDto(row, latestByConversation.get(row.conversation.id) ?? null),
  );

  return {
    data: {
      meta: {
        mine_count: mineCount,
        assigned_count: assignedCount,
        unassigned_count: unassignedCount,
        all_count: allCount,
      },
      payload,
    },
  };
}
