import { describe, it, expect, beforeEach } from 'vitest';
import { onConversationAssigned } from '../hooks/assignment-hooks.js';
import type { HookDb, HookUser, Notification } from '../types.js';

function createMockDb(users: Map<string, HookUser>) {
  const notifications: Notification[] = [];
  return {
    notifications,
    async getUser(id: string) { return users.get(id) ?? null; },
    async updateConversationStatus() {},
    async setFirstReplyAt() {},
    async getParticipantIds() { return []; },
    async createNotification(data: Notification) { notifications.push(data); },
  } satisfies HookDb & { notifications: Notification[] };
}

describe('onConversationAssigned', () => {
  const humanAgent: HookUser = { id: 'agent-1', type: 'human_agent', name: 'Alice' };
  const aiAgent: HookUser = { id: 'bot-1', type: 'ai_agent', name: 'Ron' };

  it('creates assignment notification for human agent', async () => {
    const db = createMockDb(new Map([['agent-1', humanAgent]]));
    await onConversationAssigned(db, 'conv-1', 'agent-1');
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].type).toBe('assigned');
    expect(db.notifications[0].userId).toBe('agent-1');
  });

  it('creates agent_trigger notification for AI agent', async () => {
    const db = createMockDb(new Map([['bot-1', aiAgent]]));
    await onConversationAssigned(db, 'conv-1', 'bot-1');
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].type).toBe('agent_trigger');
    expect(db.notifications[0].userId).toBe('bot-1');
  });

  it('does nothing when assignee not found', async () => {
    const db = createMockDb(new Map());
    await onConversationAssigned(db, 'conv-1', 'nonexistent');
    expect(db.notifications).toHaveLength(0);
  });

  it('includes conversationId in notification', async () => {
    const db = createMockDb(new Map([['agent-1', humanAgent]]));
    await onConversationAssigned(db, 'conv-42', 'agent-1');
    expect(db.notifications[0].conversationId).toBe('conv-42');
  });
});
