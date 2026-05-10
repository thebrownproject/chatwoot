/**
 * E2E: Multi-channel
 *
 * Same conversation model for web chat and email.
 * Validates channel-agnostic workflows -- Joanna's core requirement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Multi-channel conversations', () => {
  it('creates conversations across different channels with identical structure', async () => {
    const emailConv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Billing inquiry via email',
      priority: 'medium',
    });

    const webChatConv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Billing inquiry via chat',
      priority: 'medium',
    });

    const smsConv = await p.conversations.create(p.db, {
      channelOrigin: 'sms',
      subject: 'Billing inquiry via SMS',
      priority: 'medium',
    });

    // All conversations have the same structure regardless of channel
    for (const conv of [emailConv, webChatConv, smsConv]) {
      expect(conv.status).toBe('open');
      expect(conv.priority).toBe('medium');
      expect(conv.assigneeId).toBeNull();
      expect(conv.resolvedAt).toBeNull();
      expect(conv.snoozedUntil).toBeNull();
      expect(conv.metadata).toEqual({});
      expect(conv.createdAt).toBeInstanceOf(Date);
    }

    // Channel origins differ
    expect(emailConv.channelOrigin).toBe('email');
    expect(webChatConv.channelOrigin).toBe('web_chat');
    expect(smsConv.channelOrigin).toBe('sms');

    // Display IDs are sequential
    expect(webChatConv.displayId).toBe(emailConv.displayId + 1);
    expect(smsConv.displayId).toBe(webChatConv.displayId + 1);
  });

  it('applies the same status machine to all channels', async () => {
    const channels = ['email', 'web_chat', 'sms', 'slack', 'in_app'] as const;

    for (const channel of channels) {
      const conv = await p.conversations.create(p.db, { channelOrigin: channel });

      // Resolve
      const resolved = await p.conversations.resolve(p.db, conv.id, 'agent-1');
      expect(resolved.ok).toBe(true);

      // Reopen
      const reopened = await p.conversations.reopen(p.db, conv.id, 'contact-1');
      expect(reopened.ok).toBe(true);

      if (reopened.ok) {
        expect(reopened.conversation.status).toBe('open');
        expect(reopened.conversation.channelOrigin).toBe(channel);
      }
    }
  });

  it('filters conversations by channel origin', async () => {
    await p.conversations.create(p.db, { channelOrigin: 'email' });
    await p.conversations.create(p.db, { channelOrigin: 'email' });
    await p.conversations.create(p.db, { channelOrigin: 'web_chat' });
    await p.conversations.create(p.db, { channelOrigin: 'slack' });
    await p.conversations.create(p.db, { channelOrigin: 'in_app' });

    const emails = await p.conversations.list(p.db, { channelOrigin: 'email' });
    expect(emails.total).toBe(2);

    const webChats = await p.conversations.list(p.db, { channelOrigin: 'web_chat' });
    expect(webChats.total).toBe(1);

    const slacks = await p.conversations.list(p.db, { channelOrigin: 'slack' });
    expect(slacks.total).toBe(1);

    const all = await p.conversations.list(p.db, {});
    expect(all.total).toBe(5);
  });

  it('assigns the same agent to conversations from different channels', async () => {
    const agent = p.users.create({ type: 'human_agent', name: 'Cross-channel Agent' });

    const emailConv = await p.conversations.create(p.db, { channelOrigin: 'email' });
    const chatConv = await p.conversations.create(p.db, { channelOrigin: 'web_chat' });

    await p.conversations.assign(p.db, emailConv.id, agent.id, agent.id);
    await p.conversations.assign(p.db, chatConv.id, agent.id, agent.id);

    // Both conversations assigned to same agent
    const assigned = await p.conversations.list(p.db, { assigneeId: agent.id });
    expect(assigned.total).toBe(2);

    // Verify channels are preserved
    const channels = assigned.data.map((c) => c.channelOrigin).sort();
    expect(channels).toEqual(['email', 'web_chat']);
  });

  it('resolves email and chat conversations with identical workflow', async () => {
    const emailConv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Email ticket',
    });
    const chatConv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Chat ticket',
    });

    // Same resolve workflow for both
    await p.conversations.resolve(p.db, emailConv.id, 'agent-1');
    await p.conversations.resolve(p.db, chatConv.id, 'agent-1');

    // Both resolved
    const emailFetched = await p.conversations.getById(p.db, emailConv.id);
    const chatFetched = await p.conversations.getById(p.db, chatConv.id);

    expect(emailFetched?.status).toBe('resolved');
    expect(chatFetched?.status).toBe('resolved');

    // Both have events
    const emailEvents = await p.conversations.getEvents(p.db, emailConv.id);
    const chatEvents = await p.conversations.getEvents(p.db, chatConv.id);

    expect(emailEvents.map((e) => e.eventType)).toContain('resolved');
    expect(chatEvents.map((e) => e.eventType)).toContain('resolved');
  });

  it('routes conversations from different channels to different teams', async () => {
    // Create teams
    const emailTeam = await p.routingDb.createTeam({ name: 'Email Support' });
    const chatTeam = await p.routingDb.createTeam({ name: 'Chat Support' });

    const emailAgent = p.users.create({ type: 'human_agent', name: 'Email Agent' });
    const chatAgent = p.users.create({ type: 'human_agent', name: 'Chat Agent' });

    await p.routingDb.addTeamMember(emailTeam.id, emailAgent.id, 'member');
    await p.routingDb.addTeamMember(chatTeam.id, chatAgent.id, 'member');

    // Route email conversation
    const emailConv = await p.conversations.create(p.db, { channelOrigin: 'email' });
    const emailResult = await p.routing.executeAction(
      p.routingDb,
      emailConv.id,
      'assign_team',
      'team',
      emailTeam.id,
    );
    expect(emailResult.assignedTo).toBe(emailAgent.id);

    // Route chat conversation
    const chatConv = await p.conversations.create(p.db, { channelOrigin: 'web_chat' });
    const chatResult = await p.routing.executeAction(
      p.routingDb,
      chatConv.id,
      'assign_team',
      'team',
      chatTeam.id,
    );
    expect(chatResult.assignedTo).toBe(chatAgent.id);
  });

  it('supports channel-specific metadata while keeping core model consistent', async () => {
    const emailConv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Email with headers',
      metadata: {
        inReplyTo: '<message-id@example.com>',
        references: ['<ref1@example.com>'],
      },
    });

    const chatConv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Chat with widget context',
      metadata: {
        widgetId: 'widget-abc',
        pageUrl: 'https://app.buildpass.com/projects/123',
      },
    });

    // Core model is the same
    expect(emailConv.status).toBe('open');
    expect(chatConv.status).toBe('open');

    // Channel-specific metadata is preserved
    expect(emailConv.metadata).toHaveProperty('inReplyTo');
    expect(chatConv.metadata).toHaveProperty('widgetId');
  });
});
