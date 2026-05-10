import type { Db } from './db.js';
import type {
  Conversation,
  ConversationCreate,
  ConversationEvent,
  ConversationFilters,
  ConversationUpdate,
} from '../types.js';
import { transitionConversation } from './status-machine.js';

// ---------------------------------------------------------------------------
// Transition helper (shared by resolve/reopen/snooze/unsnooze)
// ---------------------------------------------------------------------------

type TransitionResult =
  | { ok: true; conversation: Conversation }
  | { ok: false; error: string };

async function applyTransition(
  db: Db,
  id: string,
  actorId: string,
  newStatus: Conversation['status'],
  snoozedUntil?: Date,
): Promise<TransitionResult> {
  const conv = await db.conversationCrud.getById(id);
  if (!conv) return { ok: false, error: 'Conversation not found' };

  const result = await transitionConversation({
    conversationId: id,
    actorId,
    currentStatus: conv.status,
    newStatus,
    snoozedUntil,
    onUpdate: async (update) => {
      await db.conversationCrud.update(id, {
        status: update.status,
        resolvedAt: update.resolvedAt,
        snoozedUntil: update.snoozedUntil,
      } as any);
    },
    onEvent: async (event) => {
      await db.events.create({
        conversationId: event.conversationId,
        actorId: event.actorId,
        eventType: event.eventType as ConversationEvent['eventType'],
        payload: event.payload,
      });
    },
  });

  if (!result.ok) return result;

  const updated = await db.conversationCrud.getById(id);
  return updated
    ? { ok: true, conversation: updated }
    : { ok: false, error: 'Conversation not found' };
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Create a new conversation with status=open and an initial "created" event.
 */
export async function createConversation(
  db: Db,
  data: ConversationCreate,
): Promise<Conversation> {
  const conversation = await db.conversationCrud.create(data);

  await db.events.create({
    conversationId: conversation.id,
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
  db: Db,
  id: string,
): Promise<Conversation | undefined> {
  return db.conversationCrud.getById(id);
}

/**
 * Get a conversation by its human-readable display number.
 */
export async function getConversationByDisplayId(
  db: Db,
  displayId: number,
): Promise<Conversation | undefined> {
  return db.conversationCrud.getByDisplayId(displayId);
}

/**
 * List conversations with optional filters and pagination.
 */
export async function listConversations(
  db: Db,
  filters: ConversationFilters = {},
): Promise<{ data: Conversation[]; total: number }> {
  return db.conversationCrud.list(filters);
}

/**
 * Partially update a conversation (subject, priority, metadata).
 * Use assignConversation() to change assignment; it handles events and participants.
 */
export async function updateConversation(
  db: Db,
  id: string,
  data: ConversationUpdate,
  actorId?: string,
): Promise<Conversation | undefined> {
  const changes: Record<string, unknown> = {};
  if (data.subject !== undefined) changes.subject = data.subject;
  if (data.priority !== undefined) changes.priority = data.priority;
  if (data.metadata !== undefined) changes.metadata = data.metadata;

  if (Object.keys(changes).length === 0) {
    return db.conversationCrud.getById(id);
  }

  const updated = await db.conversationCrud.update(id, data);
  if (!updated) return undefined;

  if (actorId) {
    await db.events.create({
      conversationId: id,
      actorId,
      eventType: 'status_changed',
      payload: { changes },
    });
  }

  return updated;
}

/**
 * Resolve a conversation: set status=resolved, resolved_at=now, create event.
 */
export async function resolveConversation(
  db: Db,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  return applyTransition(db, id, actorId, 'resolved');
}

/**
 * Reopen a conversation: set status=open, clear resolved_at, create event.
 */
export async function reopenConversation(
  db: Db,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  return applyTransition(db, id, actorId, 'open');
}

/**
 * Move a conversation to pending: awaiting customer or internal follow-up.
 */
export async function pendConversation(
  db: Db,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  return applyTransition(db, id, actorId, 'pending');
}

/**
 * Snooze a conversation: set status=snoozed, snoozed_until, create event.
 */
export async function snoozeConversation(
  db: Db,
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
  db: Db,
  id: string,
  actorId: string,
): Promise<TransitionResult> {
  const conv = await db.conversationCrud.getById(id);
  if (conv && conv.status !== 'snoozed') {
    return { ok: false, error: 'Conversation is not snoozed' };
  }
  return applyTransition(db, id, actorId, 'open');
}

/**
 * Get all events for a conversation (audit log).
 */
export async function getConversationEvents(
  db: Db,
  conversationId: string,
): Promise<ConversationEvent[]> {
  return db.events.list(conversationId);
}
