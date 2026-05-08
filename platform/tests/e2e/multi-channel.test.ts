/**
 * E2E: Multi-channel conversations
 *
 * Tests that conversations are channel-agnostic: same status machine,
 * assignment model, and participant model regardless of channel origin.
 * Verifies ChannelConversation mapping.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

describe('Multi-Channel', () => {
  let p: Platform;

  beforeEach(() => {
    p = createPlatform();
  });

  it('creates email and web chat channels', () => {
    const emailChannel = p.createChannel({ type: 'email', name: 'Support Email' });
    const webChatChannel = p.createChannel({ type: 'web_chat', name: 'Website Chat' });

    expect(emailChannel.type).toBe('email');
    expect(emailChannel.active).toBe(true);
    expect(webChatChannel.type).toBe('web_chat');
    expect(webChatChannel.active).toBe(true);
  });

  it('conversation started via web chat -> channel_origin: web_chat', () => {
    const webChatChannel = p.createChannel({ type: 'web_chat', name: 'Website Chat' });
    const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Hello via chat' });

    expect(conv.channelOrigin).toBe('web_chat');

    // Create channel mapping
    const mapping = p.createChannelConversation({
      channelId: webChatChannel.id,
      conversationId: conv.id,
      externalId: `widget-session-${Date.now()}`,
    });

    expect(mapping.channelId).toBe(webChatChannel.id);
    expect(mapping.conversationId).toBe(conv.id);
  });

  it('conversation started via email -> channel_origin: email', () => {
    const emailChannel = p.createChannel({ type: 'email', name: 'Support Email' });
    const contact = p.createUser({ type: 'contact', name: 'Bob', email: 'bob@test.com' });

    const conv = p.createConversation({
      channelOrigin: 'email',
      subject: 'Re: Building permit inquiry',
    });
    p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Sent via email' });

    expect(conv.channelOrigin).toBe('email');
    expect(conv.subject).toBe('Re: Building permit inquiry');

    // Create channel mapping with email-specific metadata
    const mapping = p.createChannelConversation({
      channelId: emailChannel.id,
      conversationId: conv.id,
      externalId: '<message-123@mail.example.com>',
      externalMetadata: {
        inReplyTo: '<original-456@mail.example.com>',
        references: ['<original-456@mail.example.com>'],
      },
    });

    expect(mapping.externalId).toBe('<message-123@mail.example.com>');
    expect(mapping.externalMetadata).toHaveProperty('inReplyTo');
  });

  it('both channels use same status machine', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const webConv = p.createConversation({ channelOrigin: 'web_chat' });
    const emailConv = p.createConversation({ channelOrigin: 'email' });

    // Both start as open
    expect(webConv.status).toBe('open');
    expect(emailConv.status).toBe('open');

    // Resolve web chat conversation
    const webResult = p.resolveConversation(webConv.id, agent.id);
    expect(webResult.ok).toBe(true);
    expect(p.getConversation(webConv.id)!.status).toBe('resolved');

    // Resolve email conversation
    const emailResult = p.resolveConversation(emailConv.id, agent.id);
    expect(emailResult.ok).toBe(true);
    expect(p.getConversation(emailConv.id)!.status).toBe('resolved');

    // Snooze works the same
    const snoozedConv = p.createConversation({ channelOrigin: 'sms' });
    const until = new Date(Date.now() + 3600000);
    const snoozeResult = p.snoozeConversation(snoozedConv.id, agent.id, until);
    expect(snoozeResult.ok).toBe(true);
    expect(p.getConversation(snoozedConv.id)!.status).toBe('snoozed');
  });

  it('both channels use same assignment model', () => {
    const agent1 = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const agent2 = p.createUser({ type: 'human_agent', name: 'Joel', email: 'joel@buildpass.ai' });

    const webConv = p.createConversation({ channelOrigin: 'web_chat' });
    const emailConv = p.createConversation({ channelOrigin: 'email' });

    p.assignConversation(webConv.id, agent1.id, 'system');
    p.assignConversation(emailConv.id, agent2.id, 'system');

    expect(p.getConversation(webConv.id)!.assigneeId).toBe(agent1.id);
    expect(p.getConversation(emailConv.id)!.assigneeId).toBe(agent2.id);

    // Both have assignment events
    const webEvents = p.getEvents(webConv.id);
    const emailEvents = p.getEvents(emailConv.id);
    expect(webEvents.some((e) => e.eventType === 'assigned')).toBe(true);
    expect(emailEvents.some((e) => e.eventType === 'assigned')).toBe(true);
  });

  it('both channels use same participant model', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const contact1 = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
    const contact2 = p.createUser({ type: 'contact', name: 'Bob', email: 'bob@test.com' });

    const webConv = p.createConversation({ channelOrigin: 'web_chat' });
    const emailConv = p.createConversation({ channelOrigin: 'email' });

    p.addParticipant(webConv.id, contact1.id, 'contact');
    p.addParticipant(webConv.id, agent.id, 'assignee');

    p.addParticipant(emailConv.id, contact2.id, 'contact');
    p.addParticipant(emailConv.id, agent.id, 'assignee');

    expect(p.getParticipants(webConv.id)).toHaveLength(2);
    expect(p.getParticipants(emailConv.id)).toHaveLength(2);
  });

  it('ChannelConversation mapping links channel to conversation', () => {
    const emailChannel = p.createChannel({ type: 'email', name: 'Support Email' });
    const webChatChannel = p.createChannel({ type: 'web_chat', name: 'Website Chat' });

    const conv1 = p.createConversation({ channelOrigin: 'email' });
    const conv2 = p.createConversation({ channelOrigin: 'web_chat' });

    p.createChannelConversation({
      channelId: emailChannel.id,
      conversationId: conv1.id,
      externalId: '<msg-1@example.com>',
    });

    p.createChannelConversation({
      channelId: webChatChannel.id,
      conversationId: conv2.id,
      externalId: 'ws-session-abc',
    });

    // Verify mappings
    const emailMappings = p.channelConversations.filter(
      (cc) => cc.channelId === emailChannel.id,
    );
    const webMappings = p.channelConversations.filter(
      (cc) => cc.channelId === webChatChannel.id,
    );

    expect(emailMappings).toHaveLength(1);
    expect(emailMappings[0]!.conversationId).toBe(conv1.id);

    expect(webMappings).toHaveLength(1);
    expect(webMappings[0]!.conversationId).toBe(conv2.id);
  });

  it('conversations queryable by channel origin', () => {
    p.createConversation({ channelOrigin: 'web_chat' });
    p.createConversation({ channelOrigin: 'web_chat' });
    p.createConversation({ channelOrigin: 'email' });
    p.createConversation({ channelOrigin: 'sms' });

    const webChats = p.listConversations({ channelOrigin: 'web_chat' });
    const emails = p.listConversations({ channelOrigin: 'email' });
    const sms = p.listConversations({ channelOrigin: 'sms' });

    expect(webChats).toHaveLength(2);
    expect(emails).toHaveLength(1);
    expect(sms).toHaveLength(1);
  });
});
