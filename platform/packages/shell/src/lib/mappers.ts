/**
 * Shell mappers — convert snake_case DB types to camelCase UI types.
 *
 * The DB schema uses snake_case columns (Postgres convention) which Drizzle
 * maps to camelCase TypeScript properties. The shell module may need
 * additional UI-specific transformations (computed display fields,
 * formatted dates, etc.) that don't belong in the DB layer.
 *
 * Import canonical DB types from `@buildpass/db` and map to UI shapes here.
 */
import type {
  User,
  Conversation,
  Message,
  ConversationParticipant,
} from '@buildpass/db';

// ── UI Types ───────────────────────────────────────────────────────

export interface UIUser {
  id: string;
  type: User['type'];
  name: string;
  email: string | null;
  avatarUrl: string | null;
  isAgent: boolean;
  isBot: boolean;
  createdAt: string; // ISO string for serialisation
}

export interface UIConversation {
  id: string;
  displayId: number | null;
  status: Conversation['status'];
  channelOrigin: Conversation['channelOrigin'];
  assigneeId: string | null;
  subject: string | null;
  priority: Conversation['priority'];
  snoozedUntil: string | null;
  firstReplyAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UIMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: Message['type'];
  visibility: Message['visibility'];
  body: string;
  bodyHtml: string | null;
  isInternal: boolean;
  createdAt: string;
}

export interface UIParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ConversationParticipant['role'];
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
}

// ── Mappers ────────────────────────────────────────────────────────

export function toUIUser(dbUser: User): UIUser {
  return {
    id: dbUser.id,
    type: dbUser.type,
    name: dbUser.name,
    email: dbUser.email,
    avatarUrl: dbUser.avatarUrl,
    isAgent: dbUser.type === 'human_agent' || dbUser.type === 'ai_agent',
    isBot: dbUser.type === 'ai_agent',
    createdAt: dbUser.createdAt.toISOString(),
  };
}

export function toUIConversation(dbConv: Conversation): UIConversation {
  return {
    id: dbConv.id,
    displayId: dbConv.displayId,
    status: dbConv.status,
    channelOrigin: dbConv.channelOrigin,
    assigneeId: dbConv.assigneeId,
    subject: dbConv.subject,
    priority: dbConv.priority,
    snoozedUntil: dbConv.snoozedUntil?.toISOString() ?? null,
    firstReplyAt: dbConv.firstReplyAt?.toISOString() ?? null,
    resolvedAt: dbConv.resolvedAt?.toISOString() ?? null,
    createdAt: dbConv.createdAt.toISOString(),
    updatedAt: dbConv.updatedAt.toISOString(),
  };
}

export function toUIMessage(dbMsg: Message): UIMessage {
  return {
    id: dbMsg.id,
    conversationId: dbMsg.conversationId,
    senderId: dbMsg.senderId,
    type: dbMsg.type,
    visibility: dbMsg.visibility,
    body: dbMsg.body,
    bodyHtml: dbMsg.bodyHtml,
    isInternal: dbMsg.visibility === 'internal',
    createdAt: dbMsg.createdAt.toISOString(),
  };
}

export function toUIParticipant(
  dbPart: ConversationParticipant,
): UIParticipant {
  return {
    id: dbPart.id,
    conversationId: dbPart.conversationId,
    userId: dbPart.userId,
    role: dbPart.role,
    joinedAt: dbPart.joinedAt.toISOString(),
    leftAt: dbPart.leftAt?.toISOString() ?? null,
    isActive: dbPart.leftAt === null,
  };
}
