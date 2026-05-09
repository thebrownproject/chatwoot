import { describe, it, expect, vi } from 'vitest';
import { checkSnoozedConversations, checkSnoozedConversationsDetailed, processSnoozeJob } from '../jobs/snooze-scheduler.js';
import { createMockDb } from './helpers.js';

describe('checkSnoozedConversations', () => {
  it('reopens conversations past their snooze time', async () => {
    const db = createMockDb();
    const pastDate = new Date(Date.now() - 60_000);
    db._addConversation('conv-1', 'snoozed', pastDate);
    db._addConversation('conv-2', 'snoozed', pastDate);

    const count = await checkSnoozedConversations(db);

    expect(count).toBe(2);
    expect(db._conversations.get('conv-1')!.status).toBe('open');
    expect(db._conversations.get('conv-2')!.status).toBe('open');
  });

  it('does not reopen conversations still snoozed', async () => {
    const db = createMockDb();
    const futureDate = new Date(Date.now() + 60_000);
    db._addConversation('conv-1', 'snoozed', futureDate);

    const count = await checkSnoozedConversations(db);

    expect(count).toBe(0);
    expect(db._conversations.get('conv-1')!.status).toBe('snoozed');
  });

  it('ignores non-snoozed conversations', async () => {
    const db = createMockDb();
    const pastDate = new Date(Date.now() - 60_000);
    db._addConversation('conv-1', 'open', pastDate);
    db._addConversation('conv-2', 'resolved', pastDate);

    const count = await checkSnoozedConversations(db);
    expect(count).toBe(0);
  });

  it('creates unsnoozed ConversationEvent for each reopened conversation', async () => {
    const db = createMockDb();
    const pastDate = new Date(Date.now() - 60_000);
    db._addConversation('conv-1', 'snoozed', pastDate);

    await checkSnoozedConversations(db);

    expect(db._events).toHaveLength(1);
    expect(db._events[0]!.eventType).toBe('unsnoozed');
    expect(db._events[0]!.conversationId).toBe('conv-1');
    expect(db._events[0]!.actorId).toBe('system');
    expect(db._events[0]!.payload.reason).toBe('snooze_expired');
  });

  it('returns 0 when there are no conversations', async () => {
    const db = createMockDb();
    const count = await checkSnoozedConversations(db);
    expect(count).toBe(0);
  });

  it('handles mix of due and not-due snoozed conversations', async () => {
    const db = createMockDb();
    db._addConversation('due-1', 'snoozed', new Date(Date.now() - 60_000));
    db._addConversation('not-due', 'snoozed', new Date(Date.now() + 60_000));
    db._addConversation('due-2', 'snoozed', new Date(Date.now() - 1000));

    const count = await checkSnoozedConversations(db);

    expect(count).toBe(2);
    expect(db._conversations.get('due-1')!.status).toBe('open');
    expect(db._conversations.get('due-2')!.status).toBe('open');
    expect(db._conversations.get('not-due')!.status).toBe('snoozed');
  });

  it('clears snoozedUntil when conversation is reopened', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));

    await checkSnoozedConversations(db);

    expect(db._conversations.get('conv-1')!.snoozedUntil).toBeUndefined();
  });

  it('continues processing remaining conversations when one fails', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));
    db._addConversation('conv-2', 'snoozed', new Date(Date.now() - 60_000));
    db._addConversation('conv-3', 'snoozed', new Date(Date.now() - 60_000));

    const originalUpdate = db.updateConversationStatus.bind(db);
    let callCount = 0;
    db.updateConversationStatus = async (id: string, status: any) => {
      callCount++;
      if (callCount === 2) throw new Error('DB connection lost');
      return originalUpdate(id, status);
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const count = await checkSnoozedConversations(db);

    expect(count).toBe(2);
  });

  it('still counts reopened if createConversationEvent throws', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));

    db.createConversationEvent = async () => {
      throw new Error('Event store unavailable');
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const count = await checkSnoozedConversations(db);

    expect(count).toBe(1);
    expect(db._conversations.get('conv-1')!.status).toBe('open');
  });

  it('works when createConversationEvent is not defined on db', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));

    // Remove the optional method
    (db as any).createConversationEvent = undefined;

    const count = await checkSnoozedConversations(db);

    expect(count).toBe(1);
    expect(db._conversations.get('conv-1')!.status).toBe('open');
  });
});

describe('checkSnoozedConversationsDetailed', () => {
  it('returns detailed result with reopened and failed counts', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));
    db._addConversation('conv-2', 'snoozed', new Date(Date.now() - 60_000));

    const result = await checkSnoozedConversationsDetailed(db);

    expect(result.reopened).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('reports failures with conversation ID and error', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));

    db.updateConversationStatus = async () => {
      throw new Error('DB down');
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await checkSnoozedConversationsDetailed(db);

    expect(result.reopened).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.conversationId).toBe('conv-1');
    expect(result.errors[0]!.error).toBeInstanceOf(Error);
  });
});

describe('processSnoozeJob', () => {
  it('returns SnoozeResult from checkSnoozedConversationsDetailed', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'snoozed', new Date(Date.now() - 60_000));

    const result = await processSnoozeJob(db);

    expect(result.reopened).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns zero counts when no conversations are due', async () => {
    const db = createMockDb();

    const result = await processSnoozeJob(db);

    expect(result.reopened).toBe(0);
    expect(result.failed).toBe(0);
  });
});
