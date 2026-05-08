import type { Db } from './db.js';
import type { ParticipantRole, ConversationParticipant, ParticipantWithUser } from '../types/participants.js';

/** Add a participant to a conversation. Creates a participant_joined event. */
export async function addParticipant(
  db: Db,
  conversationId: string,
  userId: string,
  role: ParticipantRole,
): Promise<ConversationParticipant> {
  const already = await db.participants.exists(conversationId, userId);
  if (already) {
    throw new Error(`User ${userId} is already a participant in conversation ${conversationId}`);
  }

  const participant = await db.participants.add(conversationId, userId, role);

  await db.events.create({
    conversationId,
    actorId: userId,
    eventType: 'participant_joined',
    payload: { userId, role },
  });

  return participant;
}

/** Remove a participant from a conversation. Sets left_at, creates a participant_left event. */
export async function removeParticipant(
  db: Db,
  conversationId: string,
  userId: string,
): Promise<void> {
  const exists = await db.participants.exists(conversationId, userId);
  if (!exists) {
    throw new Error(`User ${userId} is not a participant in conversation ${conversationId}`);
  }

  const role = await db.participants.getRole(conversationId, userId);
  if (role === 'contact') {
    throw new Error('Cannot remove the contact from their own conversation');
  }

  await db.participants.remove(conversationId, userId);

  await db.events.create({
    conversationId,
    actorId: userId,
    eventType: 'participant_left',
    payload: { userId },
  });
}

/** List active participants (left_at is null) with user details. */
export async function getParticipants(
  db: Db,
  conversationId: string,
): Promise<ParticipantWithUser[]> {
  return db.participants.list(conversationId);
}

/** Get a specific participant's role. Returns null if not a participant. */
export async function getParticipantRole(
  db: Db,
  conversationId: string,
  userId: string,
): Promise<ParticipantRole | null> {
  return db.participants.getRole(conversationId, userId);
}

/** Update a participant's role. Creates a role_changed event. */
export async function updateParticipantRole(
  db: Db,
  conversationId: string,
  userId: string,
  newRole: ParticipantRole,
): Promise<void> {
  const currentRole = await db.participants.getRole(conversationId, userId);
  if (currentRole === null) {
    throw new Error(`User ${userId} is not a participant in conversation ${conversationId}`);
  }

  await db.participants.updateRole(conversationId, userId, newRole);

  await db.events.create({
    conversationId,
    actorId: userId,
    eventType: 'role_changed',
    payload: { userId, fromRole: currentRole, toRole: newRole },
  });
}

/** Check whether a user is an active participant. */
export async function isParticipant(
  db: Db,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  return db.participants.exists(conversationId, userId);
}
