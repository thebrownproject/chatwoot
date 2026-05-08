import { describe, it, expect } from 'vitest';
import { checkSnoozedConversations } from '../jobs/snooze-scheduler.js';
import { createMockDb } from './helpers.js';

describe('checkSnoozedConversations', () => {
  it('reopens conversations past their snooze time', async () => {
    const db = createMockDb();
    const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
    db._addConversation('conv-1', 'snoozed', pastDate);
    db._addConversation('conv-2', 'snoozed', pastDate);

    const count = await checkSnoozedConversations(db);

    expect(count).toBe(2);
    expect(db._conversations.get('conv-1')!.status).toBe('open');
    expect(db._conversations.get('conv-2')!.status).toBe('open');
  });

  it('does not reopen conversations still snoozed', async () => {
    const db = createMockDb();
    const futureDate = new Date(Date.now() + 60_000); // 1 minute from now
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

  it('creates reopened ConversationEvent for each unsnoozed conversation', async () => {
    const db = createMockDb();
    const pastDate = new Date(Date.now() - 60_000);
    db._addConversation('conv-1', 'snoozed', pastDate);

    await checkSnoozedConversations(db);

    expect(db._events).toHaveLength(1);
    expect(db._events[0]!.eventType).toBe('reopened');
    expect(db._events[0]!.conversationId).toBe('conv-1');
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
});
