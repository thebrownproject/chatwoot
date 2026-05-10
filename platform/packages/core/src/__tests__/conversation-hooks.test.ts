import { describe, it, expect, beforeEach } from 'vitest';
import { onConversationEvent } from '../hooks/conversation-hooks.js';
import { onConversationAssigned } from '../hooks/assignment-hooks.js';
import type { HookDb, HookConversationEvent, HookUser, Notification } from '../types.js';

function createMockDb(
  users: Map<string, HookUser>,
  participants: Map<string, string[]>,
  teamLeads: string[] = [],
): HookDb & { notifications: Notification[] } {
  const notifications: Notification[] = [];

  return {
    notifications,

    async updateConversationStatus() {},
    async setFirstReplyAt() {},

    async getParticipantIds(conversationId) {
      return participants.get(conversationId) ?? [];
    },

    async getUser(userId) {
      return users.get(userId);
    },

    async createNotification(notification) {
      notifications.push(notification);
    },

    async getTeamLeadIds() {
      return teamLeads;
    },
  };
}

describe('onConversationEvent', () => {
  let users: Map<string, HookUser>;
  let participants: Map<string, string[]>;

  beforeEach(() => {
    users = new Map([
      ['agent-1', { id: 'agent-1', type: 'human_agent' }],
      ['agent-2', { id: 'agent-2', type: 'human_agent' }],
      ['contact-1', { id: 'contact-1', type: 'contact' }],
      ['lead-1', { id: 'lead-1', type: 'human_agent' }],
    ]);
    participants = new Map([
      ['conv-1', ['contact-1', 'agent-1']],
    ]);
  });

  it('notifies new assignee on assigned event', async () => {
    const db = createMockDb(users, participants);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1', // agent-1 assigns to agent-2
      eventType: 'assigned',
      payload: { assigneeId: 'agent-2' },
    };

    await onConversationEvent(db, event);

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-2');
    expect(db.notifications[0]!.type).toBe('assigned');
  });

  it('does NOT notify when assignee is the actor', async () => {
    const db = createMockDb(users, participants);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'assigned',
      payload: { assigneeId: 'agent-1' }, // self-assign
    };

    await onConversationEvent(db, event);

    expect(db.notifications).toHaveLength(0);
  });

  it('notifies team leads on escalation', async () => {
    const db = createMockDb(users, participants, ['lead-1']);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'escalated',
      payload: {},
    };

    await onConversationEvent(db, event);

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('lead-1');
    expect(db.notifications[0]!.type).toBe('escalated');
  });

  it('notifies participants on status change (except actor)', async () => {
    const db = createMockDb(users, participants);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'status_changed',
      payload: { from: 'open', to: 'resolved' },
    };

    await onConversationEvent(db, event);

    // contact-1 notified, agent-1 excluded (is the actor)
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('contact-1');
    expect(db.notifications[0]!.type).toBe('status_changed');
    expect(db.notifications[0]!.message).toContain('resolved');
  });

  it('does nothing for unknown event types', async () => {
    const db = createMockDb(users, participants);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'some_unknown_event',
      payload: {},
    };

    await onConversationEvent(db, event);

    expect(db.notifications).toHaveLength(0);
  });

  it('continues notifying other leads when one notification fails', async () => {
    const notifications: Notification[] = [];
    let callCount = 0;
    const db: HookDb & { notifications: Notification[] } = {
      notifications,
      async updateConversationStatus() {},
      async setFirstReplyAt() {},
      async getParticipantIds() { return []; },
      async getUser(id) { return users.get(id); },
      async createNotification(n) {
        callCount++;
        if (callCount === 1) throw new Error('first lead fails');
        notifications.push(n);
      },
      async getTeamLeadIds() { return ['lead-1', 'agent-2']; },
    };

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'escalated',
      payload: {},
    };

    await onConversationEvent(db, event);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.userId).toBe('agent-2');
  });

  it('uses "unknown" when status_changed payload has no "to" field', async () => {
    const db = createMockDb(users, participants);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'status_changed',
      payload: {},
    };

    await onConversationEvent(db, event);

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.message).toContain('unknown');
  });

  it('does not throw when db.getTeamLeadIds fails', async () => {
    const db: HookDb & { notifications: Notification[] } = {
      notifications: [],
      async updateConversationStatus() {},
      async setFirstReplyAt() {},
      async getParticipantIds() { return []; },
      async getUser(id) { return users.get(id); },
      async createNotification() {},
      async getTeamLeadIds() { throw new Error('db error'); },
    };

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'escalated',
      payload: {},
    };

    await expect(onConversationEvent(db, event)).resolves.toBeUndefined();
  });

  it('does not notify when assigned payload has non-string assigneeId', async () => {
    const db = createMockDb(users, participants);

    const event: HookConversationEvent = {
      id: 'evt-1',
      conversationId: 'conv-1',
      actorId: 'agent-1',
      eventType: 'assigned',
      payload: { assigneeId: 123 },
    };

    await onConversationEvent(db, event);

    expect(db.notifications).toHaveLength(0);
  });
});

describe('onConversationAssigned', () => {
  let users: Map<string, HookUser>;
  let participants: Map<string, string[]>;

  beforeEach(() => {
    users = new Map([
      ['agent-1', { id: 'agent-1', type: 'human_agent' }],
      ['ai-1', { id: 'ai-1', type: 'ai_agent' }],
    ]);
    participants = new Map();
  });

  it('notifies human assignee', async () => {
    const db = createMockDb(users, participants);

    await onConversationAssigned(db, 'conv-1', 'agent-1');

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-1');
    expect(db.notifications[0]!.type).toBe('assigned');
  });

  it('triggers agent orchestrator for AI agent assignee', async () => {
    const db = createMockDb(users, participants);

    await onConversationAssigned(db, 'conv-1', 'ai-1');

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('ai-1');
    expect(db.notifications[0]!.type).toBe('agent_trigger');
  });

  it('does nothing for unknown assignee', async () => {
    const db = createMockDb(users, participants);

    await onConversationAssigned(db, 'conv-1', 'unknown-user');

    expect(db.notifications).toHaveLength(0);
  });
});
