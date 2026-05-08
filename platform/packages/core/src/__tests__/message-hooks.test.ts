import { describe, it, expect, beforeEach } from 'vitest';
import { onMessageCreated } from '../hooks/message-hooks.js';
import type { HookDb, HookMessage, HookConversation, HookUser, Notification } from '../types.js';

function createMockDb(
  users: Map<string, HookUser>,
  participants: Map<string, string[]>,
): HookDb & { notifications: Notification[]; statusUpdates: { id: string; status: string }[]; firstReplyUpdates: { id: string; timestamp: Date }[] } {
  const notifications: Notification[] = [];
  const statusUpdates: { id: string; status: string }[] = [];
  const firstReplyUpdates: { id: string; timestamp: Date }[] = [];

  return {
    notifications,
    statusUpdates,
    firstReplyUpdates,

    async updateConversationStatus(conversationId, status) {
      statusUpdates.push({ id: conversationId, status });
    },

    async setFirstReplyAt(conversationId, timestamp) {
      firstReplyUpdates.push({ id: conversationId, timestamp });
    },

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
      return [];
    },
  };
}

describe('onMessageCreated', () => {
  const contactUser: HookUser = { id: 'contact-1', type: 'contact' };
  const agentUser: HookUser = { id: 'agent-1', type: 'human_agent' };
  const aiAgentUser: HookUser = { id: 'ai-1', type: 'ai_agent' };

  let users: Map<string, HookUser>;
  let participants: Map<string, string[]>;

  beforeEach(() => {
    users = new Map([
      ['contact-1', contactUser],
      ['agent-1', agentUser],
      ['ai-1', aiAgentUser],
    ]);
    participants = new Map([
      ['conv-1', ['contact-1', 'agent-1']],
    ]);
  });

  it('auto-reopens resolved conversation when contact sends a message', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'contact-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'resolved',
      assigneeId: 'agent-1',
      firstReplyAt: new Date(),
    };

    await onMessageCreated(db, message, conversation);

    expect(db.statusUpdates).toHaveLength(1);
    expect(db.statusUpdates[0]).toEqual({ id: 'conv-1', status: 'open' });
  });

  it('does NOT reopen resolved conversation when agent sends a message', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'resolved',
      assigneeId: 'agent-1',
      firstReplyAt: new Date(),
    };

    await onMessageCreated(db, message, conversation);

    expect(db.statusUpdates).toHaveLength(0);
  });

  it('does NOT reopen open conversation when contact sends a message', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'contact-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1',
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    expect(db.statusUpdates).toHaveLength(0);
  });

  it('sets first_reply_at on first human agent reply', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1',
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    expect(db.firstReplyUpdates).toHaveLength(1);
    expect(db.firstReplyUpdates[0]!.id).toBe('conv-1');
  });

  it('sets first_reply_at on first AI agent reply', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'ai-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'ai-1',
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    expect(db.firstReplyUpdates).toHaveLength(1);
  });

  it('does NOT set first_reply_at when already set', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1',
      firstReplyAt: new Date('2026-01-01'), // already set
    };

    await onMessageCreated(db, message, conversation);

    expect(db.firstReplyUpdates).toHaveLength(0);
  });

  it('does NOT set first_reply_at for internal messages', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      visibility: 'internal',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1',
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    expect(db.firstReplyUpdates).toHaveLength(0);
  });

  it('does NOT set first_reply_at for contact messages', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'contact-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1',
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    expect(db.firstReplyUpdates).toHaveLength(0);
  });

  it('notifies participants and assignee except sender', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'contact-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1',
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    // agent-1 should be notified (as participant + assignee), contact-1 excluded (sender)
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.userId).toBe('agent-1');
    expect(db.notifications[0]!.type).toBe('new_message');
  });

  it('does not duplicate notification when assignee is also a participant', async () => {
    const db = createMockDb(users, participants);

    const message: HookMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'contact-1',
      visibility: 'public',
    };

    const conversation: HookConversation = {
      id: 'conv-1',
      status: 'open',
      assigneeId: 'agent-1', // agent-1 is already in participants
      firstReplyAt: null,
    };

    await onMessageCreated(db, message, conversation);

    // Should only get one notification for agent-1, not two
    const agentNotifications = db.notifications.filter(n => n.userId === 'agent-1');
    expect(agentNotifications).toHaveLength(1);
  });
});
