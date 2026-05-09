import type { ConversationEventType, ConversationStatus, StatusTransition } from '../types.js';

/**
 * Valid state transitions for conversations.
 *
 * ```
 * open     → pending, snoozed, resolved
 * pending  → open, snoozed, resolved
 * snoozed  → open
 * resolved → open
 * ```
 */
const VALID_TRANSITIONS: ReadonlyMap<ConversationStatus, ReadonlySet<ConversationStatus>> =
  new Map([
    ['open', new Set<ConversationStatus>(['pending', 'snoozed', 'resolved'])],
    ['pending', new Set<ConversationStatus>(['open', 'snoozed', 'resolved'])],
    ['snoozed', new Set<ConversationStatus>(['open'])],
    ['resolved', new Set<ConversationStatus>(['open'])],
  ]);

/** Returns true if transitioning from `from` to `to` is allowed. */
export function validateTransition(from: ConversationStatus, to: ConversationStatus): boolean {
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.has(to);
}

/** Returns all statuses reachable from the given status. */
export function allowedTransitions(from: ConversationStatus): ConversationStatus[] {
  const allowed = VALID_TRANSITIONS.get(from);
  return allowed ? [...allowed] : [];
}

/**
 * Validates and executes a status transition on a conversation.
 *
 * Returns:
 * - `{ ok: true, transition }` on success
 * - `{ ok: false, error }` on invalid transition
 *
 * Side effects:
 * - Updates the conversation's status
 * - Sets/clears resolved_at and snoozed_until as appropriate
 * - Creates a ConversationEvent audit entry
 *
 * The caller provides callbacks for persistence so this module stays
 * decoupled from Drizzle/DB details.
 */
export async function transitionConversation(deps: {
  conversationId: string;
  actorId: string;
  currentStatus: ConversationStatus;
  newStatus: ConversationStatus;
  snoozedUntil?: Date;
  onUpdate: (data: {
    status: ConversationStatus;
    resolvedAt: Date | null;
    snoozedUntil: Date | null;
  }) => Promise<void>;
  onEvent: (event: {
    conversationId: string;
    actorId: string;
    eventType: ConversationEventType;
    payload: Record<string, unknown>;
  }) => Promise<void>;
}): Promise<
  | { ok: true; transition: StatusTransition }
  | { ok: false; error: string }
> {
  const { conversationId, actorId, currentStatus, newStatus, snoozedUntil, onUpdate, onEvent } =
    deps;

  if (!validateTransition(currentStatus, newStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}`,
    };
  }

  if (newStatus === 'snoozed' && !snoozedUntil) {
    return {
      ok: false,
      error: 'snoozedUntil is required when transitioning to snoozed',
    };
  }

  if (newStatus === 'snoozed' && snoozedUntil && snoozedUntil <= new Date()) {
    return {
      ok: false,
      error: 'snoozedUntil must be in the future',
    };
  }

  const resolvedAt = newStatus === 'resolved' ? new Date() : null;
  const snoozeUntil = newStatus === 'snoozed' ? (snoozedUntil ?? null) : null;

  await onUpdate({ status: newStatus, resolvedAt, snoozedUntil: snoozeUntil });

  const eventType = resolveEventType(currentStatus, newStatus);
  await onEvent({
    conversationId,
    actorId,
    eventType,
    payload: { from: currentStatus, to: newStatus },
  });

  return { ok: true, transition: { from: currentStatus, to: newStatus } };
}

function resolveEventType(
  fromStatus: ConversationStatus,
  newStatus: ConversationStatus,
): ConversationEventType {
  switch (newStatus) {
    case 'resolved':
      return 'resolved';
    case 'snoozed':
      return 'snoozed';
    case 'open':
      return fromStatus === 'snoozed' ? 'unsnoozed' : 'reopened';
    case 'pending':
      return 'status_changed';
  }
}
