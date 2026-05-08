/** Conversation statuses — state machine states */
export type ConversationStatus = 'open' | 'pending' | 'snoozed' | 'resolved';

/** Channel where the conversation originated */
export type ChannelOrigin = 'email' | 'web_chat' | 'sms' | 'slack' | 'in_app';

/** Conversation priority levels */
export type ConversationPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Participant roles in a conversation */
export type ParticipantRole = 'contact' | 'assignee' | 'observer' | 'copilot';

/** Event types for the conversation audit log */
export type ConversationEventType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'participant_joined'
  | 'participant_left'
  | 'escalated'
  | 'snoozed'
  | 'unsnoozed'
  | 'resolved'
  | 'reopened';

/** Data required to create a new conversation */
export interface ConversationCreate {
  channelOrigin: ChannelOrigin;
  subject?: string;
  priority?: ConversationPriority;
  assigneeId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/** Data for partially updating a conversation */
export interface ConversationUpdate {
  subject?: string;
  priority?: ConversationPriority;
  assigneeId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Filters for listing conversations */
export interface ConversationFilters {
  status?: ConversationStatus;
  assigneeId?: string;
  channelOrigin?: ChannelOrigin;
  priority?: ConversationPriority;
  limit?: number;
  offset?: number;
}

/** Represents a status transition with from/to states */
export interface StatusTransition {
  from: ConversationStatus;
  to: ConversationStatus;
}

/** A conversation participant record */
export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt: Date | null;
}

/** A conversation event (audit log entry) */
export interface ConversationEvent {
  id: string;
  conversationId: string;
  actorId: string;
  eventType: ConversationEventType;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/** Full conversation record as returned from the data layer */
export interface Conversation {
  id: string;
  displayId: number;
  status: ConversationStatus;
  channelOrigin: ChannelOrigin;
  assigneeId: string | null;
  subject: string | null;
  priority: ConversationPriority;
  snoozedUntil: Date | null;
  firstReplyAt: Date | null;
  resolvedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  participants?: ConversationParticipant[];
}

/**
 * Minimal database interface expected by data functions.
 * The real implementation comes from @buildpass/db.
 * This stub lets us develop and test without the db package.
 */
export interface DbClient {
  query: unknown;
  execute: (sql: string) => Promise<unknown>;
  [key: string]: unknown;
}
