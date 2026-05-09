import type { ParticipantRole, ConversationParticipant, ParticipantWithUser } from '../types/participants.js';
import type { ConversationEvent, ConversationEventCreate, EventType } from '../types/events.js';
import type { AssignedConversation, AssignedConversationsFilter, ConversationAssignee } from '../types/assignment.js';
import type { Label, ConversationLabel } from '../types/labels.js';
import type { CannedResponse } from '../types/canned-responses.js';

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
  labels: {
    create(name: string, color: string | null): Promise<Label>;
    list(): Promise<Label[]>;
    findByName(name: string): Promise<Label | undefined>;
    addToConversation(conversationId: string, labelId: string): Promise<ConversationLabel>;
    removeFromConversation(conversationId: string, labelId: string): Promise<void>;
    getConversationLabels(conversationId: string): Promise<Label[]>;
    getConversationsByLabel(labelId: string): Promise<string[]>;
  };
  cannedResponses: {
    create(input: { title: string; body: string; bodyHtml: string | null; createdBy: string }): Promise<CannedResponse>;
    getById(id: string): Promise<CannedResponse | undefined>;
    list(): Promise<CannedResponse[]>;
    update(id: string, input: { title?: string; body?: string; bodyHtml?: string | null }): Promise<CannedResponse | undefined>;
    delete(id: string): Promise<boolean>;
    search(query: string, limit: number): Promise<CannedResponse[]>;
  };
};
