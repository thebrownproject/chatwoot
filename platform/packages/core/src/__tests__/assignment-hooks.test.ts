import { describe, it, expect, beforeEach } from 'vitest';
import { onConversationAssigned } from '../hooks/assignment-hooks.js';
import { bootstrap, resetBootstrap } from '../bootstrap.js';
import { eventBus } from '../event-bus.js';
import type { HookDb, HookUser, Notification } from '../types.js';

function createMockDb(users: Map<string, HookUser>) {
  const notifications: Notification[] = [];
  return {
    notifications,
    async getUser(id: string) { return users.get(id); },
    async updateConversationStatus() {},
    async setFirstReplyAt() {},
    async getParticipantIds() { return [] as string[]; },
    async createNotification(data: Notification) { notifications.push(data); },
    async getTeamLeadIds() { return [] as string[]; },
  } satisfies HookDb & { notifications: Notification[] };
}

describe('onConversationAssigned', () => {
  const humanAgent: HookUser = { id: 'agent-1', type: 'human_agent' };
  const aiAgent: HookUser = { id: 'bot-1', type: 'ai_agent' };

  it('creates assignment notification for human agent', async () => {
    const db = createMockDb(new Map([['agent-1', humanAgent]]));
    await onConversationAssigned(db, 'conv-1', 'agent-1');
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.type).toBe('assigned');
    expect(db.notifications[0]!.userId).toBe('agent-1');
  });

  it('creates agent_trigger notification for AI agent', async () => {
    const db = createMockDb(new Map([['bot-1', aiAgent]]));
    await onConversationAssigned(db, 'conv-1', 'bot-1');
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.type).toBe('agent_trigger');
    expect(db.notifications[0]!.userId).toBe('bot-1');
  });

  it('does nothing when assignee not found', async () => {
    const db = createMockDb(new Map());
    await onConversationAssigned(db, 'conv-1', 'nonexistent');
    expect(db.notifications).toHaveLength(0);
  });

  it('includes conversationId in notification', async () => {
    const db = createMockDb(new Map([['agent-1', humanAgent]]));
    await onConversationAssigned(db, 'conv-42', 'agent-1');
    expect(db.notifications[0]!.conversationId).toBe('conv-42');
  });

  it('does not throw when createNotification fails', async () => {
    const db: HookDb = {
      async getUser() { return humanAgent; },
      async updateConversationStatus() {},
      async setFirstReplyAt() {},
      async getParticipantIds() { return []; },
      async createNotification() { throw new Error('db error'); },
      async getTeamLeadIds() { return []; },
    };

    await expect(onConversationAssigned(db, 'conv-1', 'agent-1')).resolves.toBeUndefined();
  });
});

describe('bootstrap', () => {
  beforeEach(() => {
    resetBootstrap();
  });

  it('registers handlers on all event types', () => {
    const db = createMockDb(new Map());
    bootstrap(db);
    expect(eventBus.listenerCount('message.created')).toBe(1);
    expect(eventBus.listenerCount('conversation.event')).toBe(1);
    expect(eventBus.listenerCount('conversation.assigned')).toBe(1);
  });

  it('throws on double bootstrap', () => {
    const db = createMockDb(new Map());
    bootstrap(db);
    expect(() => bootstrap(db)).toThrow('bootstrap() called more than once');
  });

  it('resetBootstrap allows re-bootstrap', () => {
    const db = createMockDb(new Map());
    bootstrap(db);
    resetBootstrap();
    expect(() => bootstrap(db)).not.toThrow();
  });
});
