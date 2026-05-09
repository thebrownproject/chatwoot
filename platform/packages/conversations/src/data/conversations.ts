import { and, desc, eq } from 'drizzle-orm';
import { conversationEvents, conversations } from '@buildpass/db';
import type {
  Conversation,
  ConversationCreate,
  ConversationEvent,
  ConversationFilters,
  ConversationUpdate,
  DbClient,
} from '../types.js';
import { transitionConversation } from './status-machine.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Monotonically increasing display ID counter (in-memory stub). */
let displayIdCounter = 0;

/** In-memory store for development/testing. Replaced by Drizzle queries against @buildpass/db. */
const store = {
  conversations: new Map<string, Conversation>(),
  events: new Map<string, ConversationEvent[]>(),
};

type DrizzleDb = {
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<unknown[]>;
    };
  };
  select: (...args: unknown[]) => {
    from: (table: unknown) => SelectQuery;
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (condition: unknown) => SelectQuery & {
        returning: () => Promise<unknown[]>;
      };
    };
  };
};

type SelectQuery = PromiseLike<unknown[]> & {
  where: (condition: unknown) => SelectQuery;
  orderBy: (...columns: unknown[]) => SelectOrderedQuery;
  limit: (limit: number) => Promise<unknown[]>;
};

type SelectOrderedQuery = PromiseLike<unknown[]> & {
  limit: (limit: number) => {
    offset: (offset: number) => Promise<unknown[]>;
  };
};

function isDrizzleDb(db: DbClient): db is DbClient & DrizzleDb {
  const candidate = db as Partial<DrizzleDb>;
  return (
    typeof candidate.insert === 'function' &&
    typeof candidate.select === 'function' &&
    typeof candidate.update === 'function'
  );
}

function toConversation(row: typeof conversations.$inferSelect): Conversation {
  return {
    ...row,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function toConversationEvent(row: typeof conversationEvents.$inferSelect): ConversationEvent {
  return {
    ...row,
    eventType: row.eventType as ConversationEvent['eventType'],
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}

function nextDisplayId(): number {
  displayIdCounter += 1;
  return displayIdCounter;
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

/** Reset internal state (for tests only). */
export function _resetStore(): void {
  store.conversations.clear();
  store.events.clear();
  displayIdCounter = 0;
}

// ---------------------------------------------------------------------------
// Event persistence helper
// ---------------------------------------------------------------------------

async function createEvent(
  db: DbClient,
  data: {
    conversationId: string;
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
  },
): Promise<ConversationEvent> {
  if (isDrizzleDb(db)) {
    const [event] = (await db
      .insert(conversationEvents)
      .values(data)
      .returning()) as Array<typeof conversationEvents.$inferSelect>;
    if (!event) throw new Error('Failed to create conversation event');
    return toConversationEvent(event);
  }

  const event: ConversationEvent = {
    id: generateId(),
    conversationId: data.conversationId,
    actorId: data.actorId,
    eventType: data.eventType as ConversationEvent['eventType'],
    payload: data.payload,
    createdAt: now(),
  };

  const existing = store.events.get(data.conversationId) ?? [];
  existing.push(event);
  store.events.set(data.conversationId, existing);

  return event;
}

// ---------------------------------------------------------------------------
// Transition helper (shared by resolve/reopen/snooze/unsnooze)
// ---------------------------------------------------------------------------

type TransitionResult =
  | { ok: true; conversation: Conversation }
  | { ok: false; error: string };

async function applyTransition(
  db: DbClient,
  id: string,
  actorId: string,
  newStatus: Conversation['status'],
  snoozedUntil?: Date,
): Promise<TransitionResult> {
  if (isDrizzleDb(db)) {
    const conv = await getConversationById(db, id);
    if (!conv) return { ok: false, error: 'Conversation not found' };

    const result = await transitionConversation({
      conversationId: id,
      actorId,
      currentStatus: conv.status,
      newStatus,
      snoozedUntil,
      onUpdate: async (update) => {
        await db
          .update(conversations)
          .set({
            status: update.status,
            resolvedAt: update.resolvedAt,
            snoozedUntil: update.snoozedUntil,
          })
          .where(eq(conversations.id, id));
      },
      onEvent: async (event) => {
        await createEvent(db, event);
      },
    });

    if (!result.ok) return result;

    const updated = await getConversationById(db, id);
    return updated
      ? { ok: true, conversation: updated }
      : { ok: false, error: 'Conversation not found' };
  }

  const conv = store.conversations.get(id);
  if (!conv) return { ok: false, error: 'Conversation not found' };

  const result = await transitionConversation({
    conversationId: id,
    actorId,
    currentStatus: conv.status,
    newStatus,
    snoozedUntil,
    onUpdate: async (update) => {
      conv.status = update.status;
      conv.resolvedAt = update.resolvedAt;
      conv.snoozedUntil = update.snoozedUntil;
      conv.updatedAt = now();
    },
    onEvent: async (event) => {
      await createEvent(db, event);
    },
  });

  if (!result.ok) return result;
  return { ok: true, conversation: conv };
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Create a new conversation with status=open and an initial "created" event.
 */
export async function createConversation(
  db: DbClient,
  data: ConversationCreate,
): Promise<Conversation> {
  if (isDrizzleDb(db)) {
    const [row] = (await db
      .insert(conversations)
      .values({
        channelOrigin: data.channelOrigin,
        assigneeId: data.assigneeId ?? null,
        subject: data.subject ?? null,
        priority: data.priority ?? 'medium',
        metadata: data.metadata ?? {},
      })
      .returning()) as Array<typeof conversations.$inferSelect>;
    if (!row) throw new Error('Failed to create conversation');

    const conversation = toConversation(row);
    await createEvent(db, {
      conversationId: conversation.id,
      actorId: data.actorId ?? 'system',
      eventType: 'created',
      payload: { channelOrigin: data.channelOrigin },
    });
    return conversation;
  }

  const id = generateId();
  const timestamp = now();

  const conversation: Conversation = {
    id,
    displayId: nextDisplayId(),
    status: 'open',
    channelOrigin: data.channelOrigin,
    assigneeId: data.assigneeId ?? null,
    subject: data.subject ?? null,
    priority: data.priority ?? 'medium',
    snoozedUntil: null,
    firstReplyAt: null,
    resolvedAt: null,
    metadata: data.metadata ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.conversations.set(id, conversation);

  await createEvent(db, {
    conversationId: id,
    actorId: data.actorId ?? 'system',
    eventType: 'created',
    payload: { channelOrigin: data.channelOrigin },
  });

  return conversation;
}

/**
 * Get a conversation by its UUID.
 */
export async function getConversationById(
  db: DbClient,
  id: string,
): Promise<Conversation | undefined> {
  if (isDrizzleDb(db)) {
    const [row] = (await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)) as Array<typeof conversations.$inferSelect>;
    return row ? toConversation(row) : undefined;
  }

  return store.conversations.get(id);
}

/**
 * Get a conversation by its human-readable display number.
 */
export async function getConversationByDisplayId(
  db: DbClient,
  displayId: number,
): Promise<Conversation | undefined> {
  if (isDrizzleDb(db)) {
    const [row] = (await db
      .select()
      .from(conversations)
      .where(eq(conversations.displayId, displayId))
      .limit(1)) as Array<typeof conversations.$inferSelect>;
    return row ? toConversation(row) : undefined;
  }

  for (const conv of store.conversations.values()) {
    if (conv.displayId === displayId) return conv;
  }
  return undefined;
}

/**
 * List conversations with optional filters and pagination.
 */
export async function listConversations(
  db: DbClient,
  filters: ConversationFilters = {},
): Promise<{ data: Conversation[]; total: number }> {
  if (isDrizzleDb(db)) {
    const conditions = [];
    if (filters.status !== undefined) conditions.push(eq(conversations.status, filters.status));
    if (filters.assigneeId !== undefined) {
      conditions.push(eq(conversations.assigneeId, filters.assigneeId));
    }
    if (filters.channelOrigin !== undefined) {
      conditions.push(eq(conversations.channelOrigin, filters.channelOrigin));
    }
    if (filters.priority !== undefined) conditions.push(eq(conversations.priority, filters.priority));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const baseQuery = db.select().from(conversations);
    const rows = (await (where ? baseQuery.where(where) : baseQuery)
      .orderBy(desc(conversations.createdAt))
      .limit(filters.limit ?? 25)
      .offset(filters.offset ?? 0)) as Array<typeof conversations.$inferSelect>;

    const totalRows = (await (where
      ? db.select({ id: conversations.id }).from(conversations).where(where)
      : db.select({ id: conversations.id }).from(conversations))) as unknown[];

    return {
      data: rows.map(toConversation),
      total: totalRows.length,
    };
  }

  const results = [...store.conversations.values()].filter((c) => {
    if (filters.status !== undefined && c.status !== filters.status) return false;
    if (filters.assigneeId !== undefined && c.assigneeId !== filters.assigneeId) return false;
    if (filters.channelOrigin !== undefined && c.channelOrigin !== filters.channelOrigin)
      return false;
    if (filters.priority !== undefined && c.priority !== filters.priority) return false;
    return true;
  });

  // Sort by createdAt descending (newest first)
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = results.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 25;
  const data = results.slice(offset, offset + limit);

  return { data, total };
}

/**
 * Partially update a conversation (subject, priority, metadata).
 * Use assignConversation() to change assignment; it handles events and participants.
 */
export async function updateConversation(
  db: DbClient,
  id: string,
  data: ConversationUpdate,
): Promise<Conversation | undefined> {
  if (isDrizzleDb(db)) {
    const [row] = (await db
      .update(conversations)
      .set({
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
      })
      .where(eq(conversations.id, id))
      .returning()) as Array<typeof conversations.$inferSelect>;
    return row ? toConversation(row) : undefined;
  }

  const conv = store.conversations.get(id);
  if (!conv) return undefined;

  if (data.subject !== undefined) conv.subject = data.subject;
  if (data.priority !== undefined) conv.priority = data.priority;
  if (data.metadata !== undefined) conv.metadata = { ...conv.metadata, ...data.metadata };
  conv.updatedAt = now();

  return conv;
}

/**
 * Resolve a conversation: set status=resolved, resolved_at=now, create event.
 */
export async function resolveConversation(
  db: DbClient,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  return applyTransition(db, id, actorId, 'resolved');
}

/**
 * Reopen a conversation: set status=open, clear resolved_at, create event.
 */
export async function reopenConversation(
  db: DbClient,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  const result = await applyTransition(db, id, actorId, 'open');
  if (result.ok) {
    result.conversation.resolvedAt = null;
  }
  return result;
}

/**
 * Move a conversation to pending: awaiting customer or internal follow-up.
 */
export async function pendConversation(
  db: DbClient,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  return applyTransition(db, id, actorId, 'pending');
}

/**
 * Snooze a conversation: set status=snoozed, snoozed_until, create event.
 */
export async function snoozeConversation(
  db: DbClient,
  id: string,
  actorId: string,
  until: Date,
): Promise<TransitionResult> {
  if (until <= new Date()) {
    return { ok: false, error: 'Snooze date must be in the future' };
  }
  return applyTransition(db, id, actorId, 'snoozed', until);
}

/**
 * Unsnooze a conversation: set status=open, clear snoozed_until, create event.
 * Intended to be called by the BullMQ scheduled job when snoozed_until passes.
 */
export async function unsnoozeConversation(
  db: DbClient,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  if (isDrizzleDb(db)) {
    const conv = await getConversationById(db, id);
    if (conv && conv.status !== 'snoozed') {
      return { ok: false, error: 'Conversation is not snoozed' };
    }
    return applyTransition(db, id, actorId, 'open');
  }

  const conv = store.conversations.get(id);
  if (conv && conv.status !== 'snoozed') {
    return { ok: false, error: 'Conversation is not snoozed' };
  }
  return applyTransition(db, id, actorId, 'open');
}

/**
 * Get all events for a conversation (audit log).
 */
export async function getConversationEvents(
  db: DbClient,
  conversationId: string,
): Promise<ConversationEvent[]> {
  if (isDrizzleDb(db)) {
    const rows = (await db
      .select()
      .from(conversationEvents)
      .where(eq(conversationEvents.conversationId, conversationId))
      .orderBy(desc(conversationEvents.createdAt))) as Array<typeof conversationEvents.$inferSelect>;
    return rows.map(toConversationEvent);
  }

  return store.events.get(conversationId) ?? [];
}
