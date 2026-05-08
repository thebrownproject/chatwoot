/**
 * E2E: Edge cases
 *
 * Tests boundary conditions: auto-reopen, snooze expiry, contact dedup,
 * invalid transitions, internal message visibility, graceful failures,
 * empty body rejection, label idempotency, and canned response search escaping.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform, validateTransition } from './setup.js';

describe('Edge Cases', () => {
  let p: Platform;

  beforeEach(() => {
    p = createPlatform();
  });

  it('resolved conversation gets new message -> auto-reopen', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.assignConversation(conv.id, agent.id, 'system');
    p.resolveConversation(conv.id, agent.id);

    expect(p.getConversation(conv.id)!.status).toBe('resolved');

    // Contact sends new message -> auto-reopen
    p.createMessage({
      conversationId: conv.id,
      senderId: contact.id,
      body: 'Actually one more thing',
    });

    expect(p.getConversation(conv.id)!.status).toBe('open');
    expect(p.getConversation(conv.id)!.resolvedAt).toBeNull();
  });

  it('snoozed conversation past snoozed_until -> reopen', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.assignConversation(conv.id, agent.id, 'system');

    // Snooze until 1 hour ago (already expired)
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    p.snoozeConversation(conv.id, agent.id, pastDate);

    expect(p.getConversation(conv.id)!.status).toBe('snoozed');

    // Simulate snooze scheduler checking and reopening
    const snoozedConv = p.getConversation(conv.id)!;
    if (snoozedConv.snoozedUntil && snoozedConv.snoozedUntil <= new Date()) {
      p.reopenConversation(conv.id, 'system');
    }

    expect(p.getConversation(conv.id)!.status).toBe('open');
    expect(p.getConversation(conv.id)!.snoozedUntil).toBeNull();
  });

  it('duplicate contact creation (same email) -> deduplication returns existing', () => {
    const first = p.createUser({
      type: 'contact',
      name: 'Alice Builder',
      email: 'alice@builders.com',
    });

    const second = p.createUser({
      type: 'contact',
      name: 'Alice B.',
      email: 'alice@builders.com',
    });

    // Should return same user
    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Alice Builder'); // Original name preserved
  });

  it('invalid status transitions rejected (resolved -> snoozed)', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.resolveConversation(conv.id, agent.id);

    // resolved -> snoozed is not a valid transition
    expect(validateTransition('resolved', 'snoozed')).toBe(false);

    const result = p.snoozeConversation(conv.id, agent.id, new Date(Date.now() + 3600000));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid transition');
    }

    // Status unchanged
    expect(p.getConversation(conv.id)!.status).toBe('resolved');
  });

  it('additional invalid transitions are rejected', () => {
    // snoozed -> resolved
    expect(validateTransition('snoozed', 'resolved')).toBe(false);
    // snoozed -> pending
    expect(validateTransition('snoozed', 'pending')).toBe(false);
    // resolved -> pending
    expect(validateTransition('resolved', 'pending')).toBe(false);
    // same status
    expect(validateTransition('open', 'open')).toBe(false);
  });

  it('valid transitions are accepted', () => {
    expect(validateTransition('open', 'pending')).toBe(true);
    expect(validateTransition('open', 'snoozed')).toBe(true);
    expect(validateTransition('open', 'resolved')).toBe(true);
    expect(validateTransition('pending', 'open')).toBe(true);
    expect(validateTransition('pending', 'resolved')).toBe(true);
    expect(validateTransition('snoozed', 'open')).toBe(true);
    expect(validateTransition('resolved', 'open')).toBe(true);
  });

  it('message with visibility: internal not visible in public message list', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });

    p.createMessage({
      conversationId: conv.id,
      senderId: contact.id,
      body: 'Hello!',
      visibility: 'public',
    });

    p.createMessage({
      conversationId: conv.id,
      senderId: agent.id,
      body: 'Internal: customer seems frustrated',
      visibility: 'internal',
    });

    p.createMessage({
      conversationId: conv.id,
      senderId: agent.id,
      body: 'Hi! How can I help?',
      visibility: 'public',
    });

    const publicMessages = p.listMessages(conv.id, 'public');
    const allMessages = p.listMessages(conv.id);

    expect(publicMessages).toHaveLength(2);
    expect(allMessages).toHaveLength(3);

    // Internal message not in public list
    expect(publicMessages.every((m) => m.visibility === 'public')).toBe(true);
    expect(publicMessages.some((m) => m.body.includes('Internal'))).toBe(false);
  });

  it('assigning non-existent user fails gracefully', () => {
    const conv = p.createConversation({ channelOrigin: 'web_chat' });

    expect(() => {
      p.assignConversation(conv.id, 'non-existent-user-id', 'system');
    }).toThrow('not found');
  });

  it('creating conversation with invalid channel_origin type-checks at compile time', () => {
    // The ChannelOrigin type restricts valid values.
    // At runtime, we verify that valid origins work.
    const validOrigins = ['email', 'web_chat', 'sms', 'slack', 'in_app'] as const;

    for (const origin of validOrigins) {
      const conv = p.createConversation({ channelOrigin: origin });
      expect(conv.channelOrigin).toBe(origin);
    }
  });

  it('empty message body rejected', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const conv = p.createConversation({ channelOrigin: 'web_chat' });

    expect(() => {
      p.createMessage({
        conversationId: conv.id,
        senderId: contact.id,
        body: '',
      });
    }).toThrow('empty');

    expect(() => {
      p.createMessage({
        conversationId: conv.id,
        senderId: contact.id,
        body: '   ',
      });
    }).toThrow('empty');
  });

  it('label added twice to same conversation -> idempotent', () => {
    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    const label = p.createLabel({ name: 'billing', color: '#ff0000' });

    p.addLabelToConversation(conv.id, label.id);
    p.addLabelToConversation(conv.id, label.id); // second add

    const labels = p.getConversationLabels(conv.id);
    expect(labels).toHaveLength(1);
    expect(labels[0]!.name).toBe('billing');
  });

  it('canned response search with special characters (%, _) escaped', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    p.createCannedResponse({
      title: 'Discount: 50% off',
      body: 'We offer 50% off for first-time customers.',
      createdBy: agent.id,
    });

    p.createCannedResponse({
      title: 'File naming: use_underscores',
      body: 'Please use underscores in file names.',
      createdBy: agent.id,
    });

    p.createCannedResponse({
      title: 'Regular greeting',
      body: 'Hello, how can I help?',
      createdBy: agent.id,
    });

    // Search with %
    const percentResults = p.searchCannedResponses('50%');
    expect(percentResults).toHaveLength(1);
    expect(percentResults[0]!.title).toContain('50%');

    // Search with _
    const underscoreResults = p.searchCannedResponses('use_underscores');
    expect(underscoreResults).toHaveLength(1);
    expect(underscoreResults[0]!.title).toContain('use_underscores');
  });

  it('creating message for non-existent conversation throws', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });

    expect(() => {
      p.createMessage({
        conversationId: 'non-existent-conv',
        senderId: contact.id,
        body: 'Hello',
      });
    }).toThrow('not found');
  });

  it('agent message on resolved conversation does NOT auto-reopen (only contact messages do)', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.assignConversation(conv.id, agent.id, 'system');
    p.resolveConversation(conv.id, agent.id);

    // Agent sends a follow-up message — should NOT reopen
    p.createMessage({
      conversationId: conv.id,
      senderId: agent.id,
      body: 'Follow-up note',
    });

    expect(p.getConversation(conv.id)!.status).toBe('resolved');
  });

  it('contact dedup works only for contacts, not agents', () => {
    const agent1 = p.createUser({
      type: 'human_agent',
      name: 'Joanna',
      email: 'shared@buildpass.ai',
    });

    const agent2 = p.createUser({
      type: 'human_agent',
      name: 'Joel',
      email: 'shared@buildpass.ai',
    });

    // Agents with same email should be different users
    expect(agent1.id).not.toBe(agent2.id);
  });
});
