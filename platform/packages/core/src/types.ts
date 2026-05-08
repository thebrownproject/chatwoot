/** Minimal conversation shape used by hooks (avoids coupling to full Drizzle model). */
export interface HookConversation {
  id: string;
  status: 'open' | 'pending' | 'snoozed' | 'resolved';
  assigneeId: string | null;
  firstReplyAt: Date | null;
}

/** Minimal message shape used by hooks. */
export interface HookMessage {
  id: string;
  conversationId: string;
  senderId: string;
  visibility: 'public' | 'internal';
}

/** Minimal user shape used by hooks. */
export interface HookUser {
  id: string;
  type: 'human_agent' | 'ai_agent' | 'contact' | 'system';
}

/** Conversation event as stored in the conversation_events table. */
export interface HookConversationEvent {
  id: string;
  conversationId: string;
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/** Notification stub -- represents a notification to be created. */
export interface Notification {
  userId: string;
  conversationId: string;
  type: string;
  message: string;
}

/** Minimal DB interface for hooks (decoupled from Drizzle). */
export interface HookDb {
  /** Update a conversation's status. */
  updateConversationStatus(
    conversationId: string,
    status: 'open' | 'pending' | 'snoozed' | 'resolved',
  ): Promise<void>;

  /** Set first_reply_at on a conversation. */
  setFirstReplyAt(conversationId: string, timestamp: Date): Promise<void>;

  /** Get participants of a conversation (user IDs). */
  getParticipantIds(conversationId: string): Promise<string[]>;

  /** Get a user by ID. */
  getUser(userId: string): Promise<HookUser | undefined>;

  /** Create a notification. */
  createNotification(notification: Notification): Promise<void>;

  /** Get team lead user IDs. */
  getTeamLeadIds(): Promise<string[]>;
}

export type EventMap = {
  'message.created': { message: HookMessage; conversation: HookConversation };
  'conversation.event': { event: HookConversationEvent };
  'conversation.assigned': { conversationId: string; assigneeId: string };
  'conversation.resolved': { conversationId: string; actorId: string };
  'conversation.reopened': { conversationId: string; actorId: string };
};
