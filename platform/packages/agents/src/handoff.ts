import type { DbClient, HandoffRequest } from './types.js';

// ---------------------------------------------------------------------------
// In-memory stores. Replace with DB queries (Drizzle) in production.
// Not multi-process safe -- each process would have its own copy.
// ---------------------------------------------------------------------------

/** In-memory only. Replace with DB queries for multi-process deployment. */
const handoffs = new Map<string, HandoffRequest>();

interface ConversationAssignment {
  assigneeId: string | null;
}

/** In-memory only. Replace with DB queries for multi-process deployment. */
const assignments = new Map<string, ConversationAssignment>();

interface EventRecord {
  conversationId: string;
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/** In-memory only. Replace with DB writes for multi-process deployment. */
const events: EventRecord[] = [];

/** Seed an assignment for testing. */
export function _seedAssignment(conversationId: string, assigneeId: string | null): void {
  assignments.set(conversationId, { assigneeId });
}

/** Get all recorded events (for test assertions). */
export function _getHandoffEvents(): EventRecord[] {
  return events;
}

/** Get all handoff records (for test assertions). */
export function _getHandoffs(): HandoffRequest[] {
  return [...handoffs.values()];
}

/** Reset internal state (for tests only). */
export function _resetHandoffStore(): void {
  handoffs.clear();
  assignments.clear();
  events.length = 0;
}

// ---------------------------------------------------------------------------
// Handoff: Agent -> Human
// ---------------------------------------------------------------------------

/**
 * Agent requests human takeover:
 * 1. Generate conversation summary (the reason + content serve as summary)
 * 2. Create internal note with summary + reason
 * 3. Unassign agent, reassign to queue (null assignee) or specific human
 * 4. Create ConversationEvent (escalated)
 */
export async function requestHandoff(
  _db: DbClient,
  fromAgentId: string,
  conversationId: string,
  reason: string,
  toUserId?: string,
): Promise<HandoffRequest> {
  if (toUserId && toUserId === fromAgentId) {
    throw new Error('Cannot hand off to self');
  }
  const handoff: HandoffRequest = {
    id: crypto.randomUUID(),
    fromAgentId,
    toUserId: toUserId ?? null,
    conversationId,
    reason,
    contextSummary: `Agent ${fromAgentId} escalated: ${reason}`,
    createdAt: new Date(),
  };

  handoffs.set(handoff.id, handoff);

  // Reassign conversation
  assignments.set(conversationId, { assigneeId: toUserId ?? null });

  // Record event
  events.push({
    conversationId,
    actorId: fromAgentId,
    eventType: 'escalated',
    payload: {
      handoffId: handoff.id,
      reason,
      toUserId: toUserId ?? null,
    },
  });

  return handoff;
}

// ---------------------------------------------------------------------------
// Handoff: Human -> Agent
// ---------------------------------------------------------------------------

/**
 * Human hands conversation to an agent:
 * 1. Assign agent as conversation assignee
 * 2. Agent picks up with full conversation history
 */
export async function handoffToAgent(
  _db: DbClient,
  conversationId: string,
  agentId: string,
  fromUserId: string,
): Promise<void> {
  if (agentId === fromUserId) {
    throw new Error('Cannot hand off to self');
  }

  assignments.set(conversationId, { assigneeId: agentId });

  events.push({
    conversationId,
    actorId: fromUserId,
    eventType: 'assigned',
    payload: {
      fromUserId,
      toAgentId: agentId,
      direction: 'human_to_agent',
    },
  });
}

// ---------------------------------------------------------------------------
// Handoff: Agent -> Agent
// ---------------------------------------------------------------------------

/**
 * Agent-to-agent handoff (e.g., triage -> specialist):
 * 1. Reassign conversation to target agent
 * 2. Create handoff record with reason
 * 3. Record event
 */
export async function handoffAgentToAgent(
  _db: DbClient,
  conversationId: string,
  fromAgentId: string,
  toAgentId: string,
  reason: string,
): Promise<HandoffRequest> {
  if (fromAgentId === toAgentId) {
    throw new Error('Cannot hand off to self');
  }
  const handoff: HandoffRequest = {
    id: crypto.randomUUID(),
    fromAgentId,
    toUserId: toAgentId,
    conversationId,
    reason,
    contextSummary: `Agent ${fromAgentId} handed off to agent ${toAgentId}: ${reason}`,
    createdAt: new Date(),
  };

  handoffs.set(handoff.id, handoff);
  assignments.set(conversationId, { assigneeId: toAgentId });

  events.push({
    conversationId,
    actorId: fromAgentId,
    eventType: 'assigned',
    payload: {
      handoffId: handoff.id,
      fromAgentId,
      toAgentId,
      reason,
      direction: 'agent_to_agent',
    },
  });

  return handoff;
}
