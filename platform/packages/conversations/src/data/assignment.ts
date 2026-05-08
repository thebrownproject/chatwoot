import type { Db } from './db.js';
import type { AssignedConversation, AssignedConversationsFilter, ConversationAssignee } from '../types/assignment.js';

/**
 * Assign a conversation to a user.
 * Sets Conversation.assignee_id. If the assignee is not already a participant,
 * adds them with the 'assignee' role.
 * Creates an 'assigned' event.
 */
export async function assignConversation(
  db: Db,
  conversationId: string,
  assigneeId: string,
  actorId: string,
): Promise<void> {
  await db.conversations.setAssignee(conversationId, assigneeId);

  const alreadyParticipant = await db.participants.exists(conversationId, assigneeId);
  if (!alreadyParticipant) {
    await db.participants.add(conversationId, assigneeId, 'assignee');

    await db.events.create({
      conversationId,
      actorId,
      eventType: 'participant_joined',
      payload: { userId: assigneeId, role: 'assignee', reason: 'auto_added_on_assignment' },
    });
  }

  await db.events.create({
    conversationId,
    actorId,
    eventType: 'assigned',
    payload: { assigneeId },
  });
}

/**
 * Unassign a conversation (clear assignee_id).
 * Creates an 'unassigned' event.
 */
export async function unassignConversation(
  db: Db,
  conversationId: string,
  actorId: string,
): Promise<void> {
  const currentAssignee = await db.conversations.getAssignee(conversationId);

  await db.conversations.setAssignee(conversationId, null);

  await db.events.create({
    conversationId,
    actorId,
    eventType: 'unassigned',
    payload: { previousAssigneeId: currentAssignee?.id ?? null },
  });
}

/** Get the current assignee of a conversation with user details. */
export async function getAssignee(
  db: Db,
  conversationId: string,
): Promise<ConversationAssignee | null> {
  return db.conversations.getAssignee(conversationId);
}

/** List conversations assigned to a specific user, with optional filters. */
export async function getAssignedConversations(
  db: Db,
  userId: string,
  filters?: AssignedConversationsFilter,
): Promise<AssignedConversation[]> {
  return db.conversations.listAssigned(userId, filters);
}

/** List conversations with no assignee, with optional filters. */
export async function getUnassignedConversations(
  db: Db,
  filters?: AssignedConversationsFilter,
): Promise<AssignedConversation[]> {
  return db.conversations.listUnassigned(filters);
}
