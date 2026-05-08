import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConversation,
  getConversationById,
  getConversationByDisplayId,
  listConversations,
  updateConversation,
  resolveConversation,
  reopenConversation,
  snoozeConversation,
  unsnoozeConversation,
  getConversationEvents,
  _resetStore,
} from '../data/conversations.js';
import type { DbClient } from '../types.js';

// Minimal mock db — data functions use an in-memory store, not the db client
const db = {} as DbClient;

beforeEach(() => {
  _resetStore();
});

describe('createConversation', () => {
  it('creates a conversation with status=open and a display ID', async () => {
    const conv = await createConversation(db, {
      channelOrigin: 'email',
      subject: 'Billing question',
    });

    expect(conv.id).toBeDefined();
    expect(conv.displayId).toBe(1);
    expect(conv.status).toBe('open');
    expect(conv.channelOrigin).toBe('email');
    expect(conv.subject).toBe('Billing question');
    expect(conv.priority).toBe('medium');
    expect(conv.assigneeId).toBeNull();
    expect(conv.snoozedUntil).toBeNull();
    expect(conv.resolvedAt).toBeNull();
  });

  it('increments display IDs across conversations', async () => {
    const a = await createConversation(db, { channelOrigin: 'web_chat' });
    const b = await createConversation(db, { channelOrigin: 'email' });
    expect(b.displayId).toBe(a.displayId + 1);
  });

  it('records a "created" event', async () => {
    const conv = await createConversation(db, { channelOrigin: 'slack' });
    const events = await getConversationEvents(db, conv.id);
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('created');
    expect(events[0]!.payload).toEqual({ channelOrigin: 'slack' });
  });

  it('accepts optional priority and assigneeId', async () => {
    const conv = await createConversation(db, {
      channelOrigin: 'email',
      priority: 'urgent',
      assigneeId: 'agent-1',
    });
    expect(conv.priority).toBe('urgent');
    expect(conv.assigneeId).toBe('agent-1');
  });
});

describe('getConversationById', () => {
  it('returns the conversation by UUID', async () => {
    const created = await createConversation(db, { channelOrigin: 'email' });
    const found = await getConversationById(db, created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it('returns undefined for unknown ID', async () => {
    const found = await getConversationById(db, 'nonexistent');
    expect(found).toBeUndefined();
  });
});

describe('getConversationByDisplayId', () => {
  it('returns the conversation by display number', async () => {
    const created = await createConversation(db, { channelOrigin: 'email' });
    const found = await getConversationByDisplayId(db, created.displayId);
    expect(found).toBeDefined();
    expect(found!.displayId).toBe(created.displayId);
  });

  it('returns undefined for unknown display ID', async () => {
    const found = await getConversationByDisplayId(db, 99999);
    expect(found).toBeUndefined();
  });
});

describe('listConversations', () => {
  it('returns all conversations with default pagination', async () => {
    await createConversation(db, { channelOrigin: 'email' });
    await createConversation(db, { channelOrigin: 'web_chat' });

    const result = await listConversations(db);
    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  it('filters by status', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await createConversation(db, { channelOrigin: 'web_chat' });
    await resolveConversation(db, conv.id, 'agent-1');

    const result = await listConversations(db, { status: 'resolved' });
    expect(result.total).toBe(1);
    expect(result.data[0]!.status).toBe('resolved');
  });

  it('filters by assigneeId', async () => {
    await createConversation(db, { channelOrigin: 'email', assigneeId: 'agent-1' });
    await createConversation(db, { channelOrigin: 'email', assigneeId: 'agent-2' });

    const result = await listConversations(db, { assigneeId: 'agent-1' });
    expect(result.total).toBe(1);
    expect(result.data[0]!.assigneeId).toBe('agent-1');
  });

  it('filters by channelOrigin', async () => {
    await createConversation(db, { channelOrigin: 'email' });
    await createConversation(db, { channelOrigin: 'slack' });

    const result = await listConversations(db, { channelOrigin: 'slack' });
    expect(result.total).toBe(1);
    expect(result.data[0]!.channelOrigin).toBe('slack');
  });

  it('filters by priority', async () => {
    await createConversation(db, { channelOrigin: 'email', priority: 'urgent' });
    await createConversation(db, { channelOrigin: 'email', priority: 'low' });

    const result = await listConversations(db, { priority: 'urgent' });
    expect(result.total).toBe(1);
    expect(result.data[0]!.priority).toBe('urgent');
  });

  it('paginates with limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      await createConversation(db, { channelOrigin: 'email' });
    }

    const page1 = await listConversations(db, { limit: 2, offset: 0 });
    expect(page1.total).toBe(5);
    expect(page1.data).toHaveLength(2);

    const page2 = await listConversations(db, { limit: 2, offset: 2 });
    expect(page2.data).toHaveLength(2);

    const page3 = await listConversations(db, { limit: 2, offset: 4 });
    expect(page3.data).toHaveLength(1);
  });
});

describe('updateConversation', () => {
  it('updates subject and priority', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    const updated = await updateConversation(db, conv.id, {
      subject: 'Updated subject',
      priority: 'high',
    });

    expect(updated!.subject).toBe('Updated subject');
    expect(updated!.priority).toBe('high');
  });

  it('updates assigneeId', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    const updated = await updateConversation(db, conv.id, { assigneeId: 'agent-3' });
    expect(updated!.assigneeId).toBe('agent-3');
  });

  it('merges metadata', async () => {
    const conv = await createConversation(db, {
      channelOrigin: 'email',
      metadata: { projectId: 'p1' },
    });
    const updated = await updateConversation(db, conv.id, {
      metadata: { tag: 'billing' },
    });
    expect(updated!.metadata).toEqual({ projectId: 'p1', tag: 'billing' });
  });

  it('returns undefined for unknown ID', async () => {
    const result = await updateConversation(db, 'nonexistent', { subject: 'test' });
    expect(result).toBeUndefined();
  });
});

describe('resolveConversation', () => {
  it('sets status=resolved and resolved_at', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    const result = await resolveConversation(db, conv.id, 'agent-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.status).toBe('resolved');
      expect(result.conversation.resolvedAt).toBeInstanceOf(Date);
    }
  });

  it('creates a resolved event', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await resolveConversation(db, conv.id, 'agent-1');

    const events = await getConversationEvents(db, conv.id);
    const resolvedEvent = events.find((e) => e.eventType === 'resolved');
    expect(resolvedEvent).toBeDefined();
    expect(resolvedEvent!.actorId).toBe('agent-1');
  });

  it('rejects resolving an already-resolved conversation', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await resolveConversation(db, conv.id, 'agent-1');

    const result = await resolveConversation(db, conv.id, 'agent-1');
    expect(result.ok).toBe(false);
  });

  it('returns error for unknown conversation', async () => {
    const result = await resolveConversation(db, 'nonexistent', 'agent-1');
    expect(result).toEqual({ ok: false, error: 'Conversation not found' });
  });
});

describe('reopenConversation', () => {
  it('reopens a resolved conversation', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await resolveConversation(db, conv.id, 'agent-1');

    const result = await reopenConversation(db, conv.id, 'agent-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.status).toBe('open');
      expect(result.conversation.resolvedAt).toBeNull();
    }
  });

  it('creates a reopened event', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await resolveConversation(db, conv.id, 'agent-1');
    await reopenConversation(db, conv.id, 'agent-2');

    const events = await getConversationEvents(db, conv.id);
    const reopenEvent = events.find((e) => e.eventType === 'reopened');
    expect(reopenEvent).toBeDefined();
    expect(reopenEvent!.actorId).toBe('agent-2');
  });

  it('rejects reopening an already-open conversation', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    const result = await reopenConversation(db, conv.id, 'agent-1');
    expect(result.ok).toBe(false);
  });
});

describe('snoozeConversation', () => {
  it('snoozes an open conversation with until timestamp', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    const until = new Date('2026-05-10T09:00:00Z');

    const result = await snoozeConversation(db, conv.id, 'agent-1', until);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.status).toBe('snoozed');
      expect(result.conversation.snoozedUntil).toEqual(until);
    }
  });

  it('creates a snoozed event', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await snoozeConversation(db, conv.id, 'agent-1', new Date('2026-05-10T09:00:00Z'));

    const events = await getConversationEvents(db, conv.id);
    const snoozeEvent = events.find((e) => e.eventType === 'snoozed');
    expect(snoozeEvent).toBeDefined();
  });

  it('rejects snoozing a resolved conversation', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await resolveConversation(db, conv.id, 'agent-1');

    const result = await snoozeConversation(db, conv.id, 'agent-1', new Date());
    expect(result.ok).toBe(false);
  });
});

describe('unsnoozeConversation', () => {
  it('unsnoozes a snoozed conversation', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await snoozeConversation(db, conv.id, 'agent-1', new Date('2026-05-10T09:00:00Z'));

    const result = await unsnoozeConversation(db, conv.id, 'system');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.status).toBe('open');
      expect(result.conversation.snoozedUntil).toBeNull();
    }
  });

  it('creates an unsnoozed/reopened event', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    await snoozeConversation(db, conv.id, 'agent-1', new Date('2026-05-10T09:00:00Z'));
    await unsnoozeConversation(db, conv.id, 'system');

    const events = await getConversationEvents(db, conv.id);
    const reopenEvent = events.find((e) => e.eventType === 'reopened');
    expect(reopenEvent).toBeDefined();
  });

  it('rejects unsnoozing a non-snoozed conversation', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });
    const result = await unsnoozeConversation(db, conv.id, 'system');
    expect(result).toEqual({ ok: false, error: 'Conversation is not snoozed' });
  });
});

describe('full lifecycle', () => {
  it('open -> resolved -> open (reopen on new message scenario)', async () => {
    const conv = await createConversation(db, { channelOrigin: 'web_chat' });
    expect(conv.status).toBe('open');

    // Agent resolves
    const resolved = await resolveConversation(db, conv.id, 'agent-1');
    expect(resolved.ok).toBe(true);

    // Customer sends new message -> auto-reopen
    const reopened = await reopenConversation(db, conv.id, 'contact-1');
    expect(reopened.ok).toBe(true);
    if (reopened.ok) {
      expect(reopened.conversation.status).toBe('open');
      expect(reopened.conversation.resolvedAt).toBeNull();
    }

    // Check full audit trail
    const events = await getConversationEvents(db, conv.id);
    const types = events.map((e) => e.eventType);
    expect(types).toEqual(['created', 'resolved', 'reopened']);
  });

  it('open -> snoozed -> open (snooze expiry scenario)', async () => {
    const conv = await createConversation(db, { channelOrigin: 'email' });

    await snoozeConversation(db, conv.id, 'agent-1', new Date('2026-05-10T09:00:00Z'));
    const snoozed = await getConversationById(db, conv.id);
    expect(snoozed!.status).toBe('snoozed');

    // BullMQ job fires
    await unsnoozeConversation(db, conv.id, 'system');
    const unsnoozed = await getConversationById(db, conv.id);
    expect(unsnoozed!.status).toBe('open');
    expect(unsnoozed!.snoozedUntil).toBeNull();
  });

  it('pending -> resolved (via status machine)', async () => {
    // The conversations data layer doesn't expose a direct "set pending" function,
    // since pending transitions will be driven by the messages module (e.g. waiting
    // on customer reply). This test validates the status machine allows the path.
    const { transitionConversation } = await import('../data/status-machine.js');

    let status: string = 'open';
    const pendingResult = await transitionConversation({
      conversationId: 'test-conv',
      actorId: 'agent-1',
      currentStatus: 'open',
      newStatus: 'pending',
      onUpdate: async (data) => { status = data.status; },
      onEvent: async () => {},
    });
    expect(pendingResult.ok).toBe(true);
    expect(status).toBe('pending');

    const resolvedResult = await transitionConversation({
      conversationId: 'test-conv',
      actorId: 'agent-1',
      currentStatus: 'pending',
      newStatus: 'resolved',
      onUpdate: async (data) => { status = data.status; },
      onEvent: async () => {},
    });
    expect(resolvedResult.ok).toBe(true);
    expect(status).toBe('resolved');
  });
});
