import { describe, it, expect, beforeEach } from 'vitest';
import { dispatch, type DispatchContext } from '../src/dispatcher.js';
import type { ConversationEvent, Notification, NotificationSettings } from '../src/types.js';

/**
 * Combined mock DB for notifications + notification_settings.
 */
function createMockDb() {
  const notifications: Notification[] = [];
  const settings: NotificationSettings[] = [];

  return {
    notifications,
    settings,
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      // createNotification INSERT
      if (sql.includes('INSERT INTO notifications')) {
        const [id, userId, type, title, body, conversationId, , createdAt, updatedAt] = params as [
          string, string, string, string, string, string | null, boolean, Date, Date,
        ];
        const n: Notification = {
          id,
          userId,
          type: type as Notification['type'],
          title,
          body,
          conversationId,
          read: false,
          createdAt,
          updatedAt,
        };
        notifications.push(n);
        return [n] as T[];
      }

      // getSettings SELECT
      if (sql.includes('FROM notification_settings')) {
        const [userId] = params as [string];
        const found = settings.find((s) => s.userId === userId);
        return found ? [found] as T[] : [] as T[];
      }

      return [] as T[];
    },
    async execute(_sql: string, _params?: unknown[]): Promise<{ rowCount: number }> {
      return { rowCount: 0 };
    },
  };
}

function createMockContext(overrides?: Partial<DispatchContext>): DispatchContext {
  return {
    getParticipants: async () => [
      { userId: 'agent-1', role: 'assignee' },
      { userId: 'contact-1', role: 'contact' },
    ],
    getAssigneeId: async () => 'agent-1',
    getTeamLeadIds: async () => ['lead-1', 'lead-2'],
    ...overrides,
  };
}

describe('notification dispatcher', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('dispatches new_message notifications to assignee and participants (not sender)', async () => {
    const event: ConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'contact-1', // sender is contact
      eventType: 'new_message',
      payload: {},
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    // Should notify agent-1 (assignee + participant), but not contact-1 (sender)
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-1');
    expect(db.notifications[0]!.type).toBe('new_message');
  });

  it('dispatches assignment notifications to new assignee', async () => {
    const event: ConversationEvent = {
      id: 'evt-2',
      conversationId: 'conv-1',
      actorId: 'admin-1',
      eventType: 'assigned',
      payload: { assigneeId: 'agent-2' },
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-2');
    expect(db.notifications[0]!.type).toBe('assignment');
  });

  it('dispatches mention notifications to mentioned user', async () => {
    const event: ConversationEvent = {
      id: 'evt-3',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'mention',
      payload: { mentionedUserId: 'agent-3' },
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-3');
    expect(db.notifications[0]!.type).toBe('mention');
  });

  it('dispatches escalation notifications to team leads', async () => {
    const event: ConversationEvent = {
      id: 'evt-4',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'escalated',
      payload: {},
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    expect(db.notifications).toHaveLength(2);
    expect(db.notifications.map((n) => n.userId).sort()).toEqual(['lead-1', 'lead-2']);
    expect(db.notifications[0]!.type).toBe('escalation');
  });

  it('dispatches status_change to assignee (not the actor)', async () => {
    const event: ConversationEvent = {
      id: 'evt-5',
      conversationId: 'conv-1',
      actorId: 'admin-1', // different from assignee
      eventType: 'status_changed',
      payload: { from: 'open', to: 'resolved' },
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-1');
    expect(db.notifications[0]!.type).toBe('status_change');
  });

  it('does not notify when assignee is the actor for status_change', async () => {
    const event: ConversationEvent = {
      id: 'evt-6',
      conversationId: 'conv-1',
      actorId: 'agent-1', // same as assignee
      eventType: 'status_changed',
      payload: { from: 'open', to: 'resolved' },
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    expect(db.notifications).toHaveLength(0);
  });

  it('respects user notification settings — filters disabled types', async () => {
    // Disable 'new_message' for agent-1
    db.settings.push({
      id: 'settings-1',
      userId: 'agent-1',
      emailEnabled: true,
      pushEnabled: true,
      settings: {
        new_message: false,
        assignment: true,
        mention: true,
        status_change: true,
        escalation: true,
      },
    });

    const event: ConversationEvent = {
      id: 'evt-7',
      conversationId: 'conv-1',
      actorId: 'contact-1',
      eventType: 'new_message',
      payload: {},
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    // agent-1 has new_message disabled, so should not be notified
    expect(db.notifications).toHaveLength(0);
  });

  it('ignores unknown event types', async () => {
    const event: ConversationEvent = {
      id: 'evt-8',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'unknown_event',
      payload: {},
      createdAt: new Date(),
    };

    await dispatch(db, event, createMockContext());

    expect(db.notifications).toHaveLength(0);
  });
});
