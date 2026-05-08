import type { Db } from './db.js';
import type { ConversationEvent, ConversationEventCreate, EventType } from '../types/events.js';

/** Create a conversation event (generic audit log entry). */
export async function createEvent(db: Db, data: ConversationEventCreate): Promise<ConversationEvent> {
  return db.events.create(data);
}

/** List all events for a conversation, ordered by created_at ascending. */
export async function listEvents(db: Db, conversationId: string): Promise<ConversationEvent[]> {
  return db.events.list(conversationId);
}

/** List events for a conversation filtered by event type. */
export async function getEventsByType(
  db: Db,
  conversationId: string,
  eventType: EventType,
): Promise<ConversationEvent[]> {
  return db.events.listByType(conversationId, eventType);
}
