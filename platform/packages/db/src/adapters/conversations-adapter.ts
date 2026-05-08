/**
 * Conversations adapter — implements conversation CRUD and message operations
 * using the Drizzle repository.
 *
 * Replaces the in-memory Map<string, T> + custom DbClient pattern that the
 * conversations module was using with proper Drizzle queries.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import type { Db } from '../client.js';
import { conversations, conversationParticipants } from '../schema/conversations.js';
import { conversationEvents } from '../schema/conversation-events.js';
import { messages } from '../schema/messages.js';
import { conversationLabels } from '../schema/labels.js';
import type {
  Conversation,
  NewConversation,
  ConversationParticipant,
  NewConversationParticipant,
  ConversationEvent,
  NewConversationEvent,
  Message,
  NewMessage,
} from '../types.js';

export interface ConversationsDb {
  // Conversations
  findConversationById(id: string): Promise<Conversation | undefined>;
  listConversations(opts?: {
    status?: string;
    assigneeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]>;
  createConversation(data: NewConversation): Promise<Conversation>;
  updateConversation(
    id: string,
    data: Partial<NewConversation>,
  ): Promise<Conversation | undefined>;

  // Messages
  findMessagesByConversation(
    conversationId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<Message[]>;
  createMessage(data: NewMessage): Promise<Message>;

  // Participants
  findParticipants(
    conversationId: string,
  ): Promise<ConversationParticipant[]>;
  addParticipant(
    data: NewConversationParticipant,
  ): Promise<ConversationParticipant>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;

  // Events
  createEvent(data: NewConversationEvent): Promise<ConversationEvent>;
  findEventsByConversation(
    conversationId: string,
  ): Promise<ConversationEvent[]>;
}

export class ConversationsAdapter implements ConversationsDb {
  constructor(private readonly db: Db) {}

  // ── Conversations ────────────────────────────────────────────────

  async findConversationById(
    id: string,
  ): Promise<Conversation | undefined> {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return rows[0];
  }

  async listConversations(opts?: {
    status?: string;
    assigneeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    const conditions = [];
    if (opts?.status) {
      conditions.push(
        eq(conversations.status, opts.status as Conversation['status']),
      );
    }
    if (opts?.assigneeId) {
      conditions.push(eq(conversations.assigneeId, opts.assigneeId));
    }

    let query = this.db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query;
  }

  async createConversation(data: NewConversation): Promise<Conversation> {
    const rows = await this.db
      .insert(conversations)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async updateConversation(
    id: string,
    data: Partial<NewConversation>,
  ): Promise<Conversation | undefined> {
    const rows = await this.db
      .update(conversations)
      .set(data)
      .where(eq(conversations.id, id))
      .returning();
    return rows[0];
  }

  // ── Messages ─────────────────────────────────────────────────────

  async findMessagesByConversation(
    conversationId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(opts?.limit ?? 100)
      .offset(opts?.offset ?? 0);
  }

  async createMessage(data: NewMessage): Promise<Message> {
    const rows = await this.db
      .insert(messages)
      .values(data)
      .returning();

    // Update first_reply_at if this is the first agent reply
    if (data.senderId && data.visibility === 'public') {
      await this.db
        .update(conversations)
        .set({ firstReplyAt: sql`COALESCE(first_reply_at, now())` })
        .where(eq(conversations.id, data.conversationId));
    }

    return rows[0]!;
  }

  // ── Participants ─────────────────────────────────────────────────

  async findParticipants(
    conversationId: string,
  ): Promise<ConversationParticipant[]> {
    return this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }

  async addParticipant(
    data: NewConversationParticipant,
  ): Promise<ConversationParticipant> {
    const rows = await this.db
      .insert(conversationParticipants)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return rows[0]!;
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.db
      .update(conversationParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      );
  }

  // ── Events ───────────────────────────────────────────────────────

  async createEvent(
    data: NewConversationEvent,
  ): Promise<ConversationEvent> {
    const rows = await this.db
      .insert(conversationEvents)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async findEventsByConversation(
    conversationId: string,
  ): Promise<ConversationEvent[]> {
    return this.db
      .select()
      .from(conversationEvents)
      .where(eq(conversationEvents.conversationId, conversationId))
      .orderBy(conversationEvents.createdAt);
  }
}
