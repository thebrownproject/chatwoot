import type { ParticipantRole, ConversationParticipant, ParticipantWithUser } from '../types/participants.js';
import type { ConversationEvent, ConversationEventCreate, EventType } from '../types/events.js';
import type { AssignedConversation, AssignedConversationsFilter, ConversationAssignee } from '../types/assignment.js';

/**
 * Database adapter interface for the conversations module.
 * Implementations back onto drizzle/@buildpass/db in production
 * and an in-memory store in tests.
 */
export type Db = {
  participants: {
    add(conversationId: string, userId: string, role: ParticipantRole): Promise<ConversationParticipant>;
    remove(conversationId: string, userId: string): Promise<void>;
    list(conversationId: string): Promise<ParticipantWithUser[]>;
    getRole(conversationId: string, userId: string): Promise<ParticipantRole | null>;
    updateRole(conversationId: string, userId: string, role: ParticipantRole): Promise<void>;
    exists(conversationId: string, userId: string): Promise<boolean>;
  };
  conversations: {
    setAssignee(conversationId: string, assigneeId: string | null): Promise<void>;
    getAssignee(conversationId: string): Promise<ConversationAssignee | null>;
    listAssigned(userId: string, filters?: AssignedConversationsFilter): Promise<AssignedConversation[]>;
    listUnassigned(filters?: AssignedConversationsFilter): Promise<AssignedConversation[]>;
  };
  events: {
    create(data: ConversationEventCreate): Promise<ConversationEvent>;
    list(conversationId: string): Promise<ConversationEvent[]>;
    listByType(conversationId: string, eventType: EventType): Promise<ConversationEvent[]>;
  };
};
