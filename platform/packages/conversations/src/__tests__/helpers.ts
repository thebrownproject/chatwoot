import type { Db } from '../data/db.js';
import type { ParticipantRole, ConversationParticipant, ParticipantWithUser } from '../types/participants.js';
import type { ConversationEvent, ConversationEventCreate } from '../types/events.js';
import type { AssignedConversation, AssignedConversationsFilter, ConversationAssignee } from '../types/assignment.js';
import type { Message, CreateMessageInput, ListMessagesInput, SearchMessagesInput } from '../types/messages.js';

/** Simple in-memory DB for unit tests. */
export function createTestDb(): Db {
  const participantStore: ConversationParticipant[] = [];
  const eventStore: ConversationEvent[] = [];
  const messageStore: Message[] = [];
  const conversationAssignees: Map<string, string | null> = new Map();

  const conversationStore: AssignedConversation[] = [];

  let idCounter = 0;
  const nextId = () => {
    idCounter++;
    return `00000000-0000-0000-0000-${String(idCounter).padStart(12, '0')}`;
  };

  const userStore: Map<string, { id: string; name: string; email: string | null; type: string }> = new Map();

  function seedUser(id: string, name: string, email: string | null = null, type = 'human_agent') {
    userStore.set(id, { id, name, email, type });
  }

  function seedConversation(conv: AssignedConversation) {
    conversationStore.push(conv);
    conversationAssignees.set(conv.id, conv.assigneeId || null);
  }

  const db: Db & {
    seedUser: typeof seedUser;
    seedConversation: typeof seedConversation;
    getEvents: () => ConversationEvent[];
    getMessages: () => Message[];
  } = {
    seedUser,
    seedConversation,
    getEvents: () => [...eventStore],
    getMessages: () => [...messageStore],
    participants: {
      async add(conversationId, userId, role): Promise<ConversationParticipant> {
        const p: ConversationParticipant = {
          id: nextId(),
          conversationId,
          userId,
          role,
          joinedAt: new Date(),
          leftAt: null,
        };
        participantStore.push(p);
        return p;
      },
      async remove(conversationId, userId): Promise<void> {
        const p = participantStore.find(
          (x) => x.conversationId === conversationId && x.userId === userId && x.leftAt === null,
        );
        if (p) p.leftAt = new Date();
      },
      async list(conversationId): Promise<ParticipantWithUser[]> {
        return participantStore
          .filter((x) => x.conversationId === conversationId && x.leftAt === null)
          .map((x) => ({
            ...x,
            user: userStore.get(x.userId) ?? { id: x.userId, name: 'Unknown', email: null, type: 'human_agent' },
          }));
      },
      async getRole(conversationId, userId): Promise<ParticipantRole | null> {
        const p = participantStore.find(
          (x) => x.conversationId === conversationId && x.userId === userId && x.leftAt === null,
        );
        return p?.role ?? null;
      },
      async updateRole(conversationId, userId, role): Promise<void> {
        const p = participantStore.find(
          (x) => x.conversationId === conversationId && x.userId === userId && x.leftAt === null,
        );
        if (p) p.role = role;
      },
      async exists(conversationId, userId): Promise<boolean> {
        return participantStore.some(
          (x) => x.conversationId === conversationId && x.userId === userId && x.leftAt === null,
        );
      },
    },
    conversations: {
      async setAssignee(conversationId, assigneeId): Promise<void> {
        conversationAssignees.set(conversationId, assigneeId);
        const conv = conversationStore.find((c) => c.id === conversationId);
        if (conv) conv.assigneeId = assigneeId ?? '';
      },
      async getAssignee(conversationId): Promise<ConversationAssignee | null> {
        const assigneeId = conversationAssignees.get(conversationId);
        if (!assigneeId) return null;
        const user = userStore.get(assigneeId);
        return user ?? null;
      },
      async listAssigned(userId, filters?: AssignedConversationsFilter): Promise<AssignedConversation[]> {
        return conversationStore.filter((c) => {
          if (c.assigneeId !== userId) return false;
          if (filters?.status && c.status !== filters.status) return false;
          if (filters?.priority && c.priority !== filters.priority) return false;
          return true;
        });
      },
      async listUnassigned(filters?: AssignedConversationsFilter): Promise<AssignedConversation[]> {
        return conversationStore.filter((c) => {
          const assignee = conversationAssignees.get(c.id);
          if (assignee) return false;
          if (filters?.status && c.status !== filters.status) return false;
          if (filters?.priority && c.priority !== filters.priority) return false;
          return true;
        });
      },
    },
    events: {
      async create(data: ConversationEventCreate): Promise<ConversationEvent> {
        const event: ConversationEvent = {
          id: nextId(),
          conversationId: data.conversationId,
          actorId: data.actorId,
          eventType: data.eventType,
          payload: data.payload ?? {},
          createdAt: new Date(),
        };
        eventStore.push(event);
        return event;
      },
      async list(conversationId): Promise<ConversationEvent[]> {
        return eventStore
          .filter((e) => e.conversationId === conversationId)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
      async listByType(conversationId, eventType): Promise<ConversationEvent[]> {
        return eventStore
          .filter((e) => e.conversationId === conversationId && e.eventType === eventType)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
    },
    messages: {
      async create(input: CreateMessageInput): Promise<Message> {
        const timestamp = new Date();
        const msg: Message = {
          id: nextId(),
          conversationId: input.conversationId,
          senderId: input.senderId,
          type: input.type ?? 'text',
          visibility: input.visibility ?? 'public',
          body: input.body,
          bodyHtml: input.bodyHtml ?? null,
          metadata: input.metadata ?? {},
          attachments: input.attachments ?? [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        messageStore.push(msg);
        return msg;
      },
      async getById(id: string): Promise<Message | undefined> {
        return messageStore.find((m) => m.id === id);
      },
      async list(input: ListMessagesInput): Promise<Message[]> {
        const filtered = messageStore
          .filter((m) => {
            if (m.conversationId !== input.conversationId) return false;
            if (input.visibility && m.visibility !== input.visibility) return false;
            return true;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const limit = input.limit ?? 50;
        const offset = input.offset ?? 0;
        return filtered.slice(offset, offset + limit);
      },
      async search(input: SearchMessagesInput): Promise<Message[]> {
        const query = input.query.toLowerCase();
        const filtered = messageStore
          .filter((m) => m.body.toLowerCase().includes(query));
        const limit = input.limit ?? 20;
        const offset = input.offset ?? 0;
        return filtered.slice(offset, offset + limit);
      },
    },
  };

  return db;
}

export type TestDb = ReturnType<typeof createTestDb>;
