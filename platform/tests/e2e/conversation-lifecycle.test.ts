/**
 * E2E: Full conversation lifecycle
 *
 * Tests the complete flow: contact sends message -> conversation created ->
 * agent assigned -> agent replies -> resolved -> contact reopens -> snoozed.
 * Verifies ConversationEvents at each step and display_id auto-incrementing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

describe('Conversation Lifecycle', () => {
  let p: Platform;

  beforeEach(() => {
    p = createPlatform();
  });

  it('creates a contact user', () => {
    const contact = p.createUser({
      type: 'contact',
      name: 'Alice Builder',
      email: 'alice@builders.com',
    });

    expect(contact.id).toBeDefined();
    expect(contact.type).toBe('contact');
    expect(contact.name).toBe('Alice Builder');
    expect(contact.email).toBe('alice@builders.com');
  });

  it('creates a web chat channel', () => {
    const channel = p.createChannel({
      type: 'web_chat',
      name: 'Website Chat',
    });

    expect(channel.id).toBeDefined();
    expect(channel.type).toBe('web_chat');
    expect(channel.active).toBe(true);
  });

  it('contact sends first message -> conversation created (status: open)', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const channel = p.createChannel({ type: 'web_chat', name: 'Chat' });

    const conv = p.createConversation({
      channelOrigin: channel.type,
      subject: 'Help with my project',
    });

    expect(conv.status).toBe('open');
    expect(conv.channelOrigin).toBe('web_chat');
    expect(conv.displayId).toBe(1);

    // Contact sends first message
    const msg = p.createMessage({
      conversationId: conv.id,
      senderId: contact.id,
      body: 'Hi, I need help with my building permit',
    });

    expect(msg.body).toBe('Hi, I need help with my building permit');
    expect(msg.visibility).toBe('public');

    // Add contact as participant
    p.addParticipant(conv.id, contact.id, 'contact');

    // Verify created event exists
    const events = p.getEvents(conv.id);
    expect(events.some((e) => e.eventType === 'created')).toBe(true);
  });

  it('agent assigned to conversation', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Help please' });

    // Assign agent
    p.assignConversation(conv.id, agent.id, 'system');

    const updated = p.getConversation(conv.id)!;
    expect(updated.assigneeId).toBe(agent.id);

    // Verify assignment event
    const events = p.getEvents(conv.id);
    expect(events.some((e) => e.eventType === 'assigned')).toBe(true);
  });

  it('agent replies -> first_reply_at set', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Help please' });
    p.assignConversation(conv.id, agent.id, 'system');

    // Agent replies
    p.createMessage({
      conversationId: conv.id,
      senderId: agent.id,
      body: 'Hi Alice, I can help with that!',
    });
    p.setFirstReplyAt(conv.id);

    const updated = p.getConversation(conv.id)!;
    expect(updated.firstReplyAt).toBeInstanceOf(Date);
  });

  it('agent resolves conversation -> status: resolved', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Help please' });
    p.assignConversation(conv.id, agent.id, 'system');
    p.createMessage({ conversationId: conv.id, senderId: agent.id, body: 'Done!' });

    const result = p.resolveConversation(conv.id, agent.id);
    expect(result.ok).toBe(true);

    const updated = p.getConversation(conv.id)!;
    expect(updated.status).toBe('resolved');
    expect(updated.resolvedAt).toBeInstanceOf(Date);

    // Verify resolved event
    const events = p.getEvents(conv.id);
    expect(events.some((e) => e.eventType === 'resolved')).toBe(true);
  });

  it('contact sends new message -> conversation auto-reopens', () => {
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
      body: 'Actually, I have one more question',
    });

    const updated = p.getConversation(conv.id)!;
    expect(updated.status).toBe('open');

    // Verify reopened event
    const events = p.getEvents(conv.id);
    expect(events.some((e) => e.eventType === 'reopened')).toBe(true);
  });

  it('agent snoozes conversation -> status: snoozed', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.assignConversation(conv.id, agent.id, 'system');

    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const result = p.snoozeConversation(conv.id, agent.id, snoozedUntil);
    expect(result.ok).toBe(true);

    const updated = p.getConversation(conv.id)!;
    expect(updated.status).toBe('snoozed');
    expect(updated.snoozedUntil).toEqual(snoozedUntil);

    // Verify snoozed event
    const events = p.getEvents(conv.id);
    expect(events.some((e) => e.eventType === 'snoozed')).toBe(true);
  });

  it('verifies all ConversationEvents across the full lifecycle', () => {
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    // 1. Create conversation
    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Hello' });

    // 2. Assign agent
    p.assignConversation(conv.id, agent.id, 'system');

    // 3. Agent replies
    p.createMessage({ conversationId: conv.id, senderId: agent.id, body: 'Hi!' });
    p.setFirstReplyAt(conv.id);

    // 4. Resolve
    p.resolveConversation(conv.id, agent.id);

    // 5. Contact reopens
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'One more thing' });

    // 6. Snooze
    p.snoozeConversation(conv.id, agent.id, new Date(Date.now() + 3600000));

    const events = p.getEvents(conv.id);
    const eventTypes = events.map((e) => e.eventType);

    expect(eventTypes).toContain('created');
    expect(eventTypes).toContain('assigned');
    expect(eventTypes).toContain('resolved');
    expect(eventTypes).toContain('reopened');
    expect(eventTypes).toContain('snoozed');

    // Events should be in chronological order
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        events[i - 1]!.createdAt.getTime(),
      );
    }
  });

  it('display_id is auto-incrementing across conversations', () => {
    const conv1 = p.createConversation({ channelOrigin: 'web_chat' });
    const conv2 = p.createConversation({ channelOrigin: 'email' });
    const conv3 = p.createConversation({ channelOrigin: 'web_chat' });

    expect(conv1.displayId).toBe(1);
    expect(conv2.displayId).toBe(2);
    expect(conv3.displayId).toBe(3);
  });
});
