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
  _db: DbClient,
  data: {
    conversationId: string;
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
  },
): Promise<ConversationEvent> {
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
    actorId: data.assigneeId ?? 'system',
    eventType: 'created',
    payload: { channelOrigin: data.channelOrigin },
  });

  return conversation;
}

/**
 * Get a conversation by its UUID.
 */
export async function getConversationById(
  _db: DbClient,
  id: string,
): Promise<Conversation | undefined> {
  return store.conversations.get(id);
}

/**
 * Get a conversation by its human-readable display number.
 */
export async function getConversationByDisplayId(
  _db: DbClient,
  displayId: number,
): Promise<Conversation | undefined> {
  for (const conv of store.conversations.values()) {
    if (conv.displayId === displayId) return conv;
  }
  return undefined;
}

/**
 * List conversations with optional filters and pagination.
 */
export async function listConversations(
  _db: DbClient,
  filters: ConversationFilters = {},
): Promise<{ data: Conversation[]; total: number }> {
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
 * Partially update a conversation (subject, priority, assigneeId, metadata).
 */
export async function updateConversation(
  _db: DbClient,
  id: string,
  data: ConversationUpdate,
): Promise<Conversation | undefined> {
  const conv = store.conversations.get(id);
  if (!conv) return undefined;

  if (data.subject !== undefined) conv.subject = data.subject;
  if (data.priority !== undefined) conv.priority = data.priority;
  if (data.assigneeId !== undefined) conv.assigneeId = data.assigneeId;
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
  return applyTransition(db, id, actorId, 'open');
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
  _db: DbClient,
  conversationId: string,
): Promise<ConversationEvent[]> {
  return store.events.get(conversationId) ?? [];
}
