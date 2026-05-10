/**
 * E2E: Critical support team flows
 *
 * Three integration tests that exercise multiple modules together:
 * 1. Conversation lifecycle (daily agent workflow)
 * 2. Email inbound → thread → reply (email channel + conversations + hooks)
 * 3. Assignment + routing + teams (routing engine + round-robin + teams)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform, getRoutingAssignment } from './setup.js';
import type { RoutingRule, RoutableConversation } from './setup.js';

import { EmailAdapter } from '../../packages/channels/src/adapters/email.js';
import { matchToConversation, normaliseSubject } from '../../packages/channels/src/adapters/email-threading.js';
import { sanitizeInboundHtml } from '../../packages/channels/src/sanitize-html.js';
import type { ThreadingDb } from '../../packages/channels/src/adapters/email-threading.js';
import type { ChannelConversationRecord } from '../../packages/channels/src/types/email.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

// ---------------------------------------------------------------------------
// Flow 1: Conversation Lifecycle
// ---------------------------------------------------------------------------

describe('Flow 1: Conversation Lifecycle (support agent daily workflow)', () => {
  it('full lifecycle: create → inbox → assign → reply → resolve → auto-reopen → resolve again', async () => {
    // 1. Create a contact and agent
    const customer = p.users.create({ type: 'contact', name: 'Sarah Builder', email: 'sarah@example.com' });
    const agent = p.users.create({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.com' });

    // 2. Customer sends first message → conversation created
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'How do I submit a building permit?',
      actorId: customer.id,
    });

    expect(conv.status).toBe('open');
    expect(conv.firstReplyAt).toBeNull();
    expect(conv.resolvedAt).toBeNull();

    // 3. Conversation appears in inbox as "open"
    const inbox = await p.conversations.list(p.db, { status: 'open' });
    expect(inbox.total).toBe(1);
    expect(inbox.data[0].id).toBe(conv.id);

    // 4. Agent is assigned
    await p.conversations.assign(p.db, conv.id, agent.id, agent.id);
    const afterAssign = await p.conversations.getById(p.db, conv.id);
    expect(afterAssign?.assigneeId).toBe(agent.id);

    // 5. Agent sends a reply → firstReplyAt is set via hook
    const hookDb = p.createHookDb();
    const agentMessage = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: agent.id,
      visibility: 'public' as const,
    };
    const hookConv = {
      id: conv.id,
      status: conv.status,
      assigneeId: agent.id,
      firstReplyAt: null as Date | null,
    };

    await p.hooks.onMessageCreated(hookDb, agentMessage, hookConv);

    // Verify firstReplyAt was set
    const afterReply = await p.conversations.getById(p.db, conv.id);
    expect(afterReply?.firstReplyAt).toBeInstanceOf(Date);

    // 6. More messages exchanged (customer replies)
    const customerMessage = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: customer.id,
      visibility: 'public' as const,
    };
    // Update hookConv to reflect current state
    hookConv.firstReplyAt = afterReply!.firstReplyAt;
    await p.hooks.onMessageCreated(hookDb, customerMessage, hookConv);

    // firstReplyAt should NOT change on subsequent messages
    const afterSecondMessage = await p.conversations.getById(p.db, conv.id);
    expect(afterSecondMessage?.firstReplyAt).toEqual(afterReply?.firstReplyAt);

    // 7. Agent resolves conversation
    const resolved = await p.conversations.resolve(p.db, conv.id, agent.id);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.conversation.status).toBe('resolved');
      expect(resolved.conversation.resolvedAt).toBeInstanceOf(Date);
    }

    // 8. Customer replies → conversation auto-reopens via hook
    const afterResolveConv = await p.conversations.getById(p.db, conv.id);
    const reopenHookConv = {
      id: conv.id,
      status: afterResolveConv!.status,
      assigneeId: afterResolveConv!.assigneeId,
      firstReplyAt: afterResolveConv!.firstReplyAt,
    };
    const customerReplyAfterResolve = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: customer.id,
      visibility: 'public' as const,
    };
    await p.hooks.onMessageCreated(hookDb, customerReplyAfterResolve, reopenHookConv);

    // Verify conversation was reopened by the hook
    const afterReopen = await p.conversations.getById(p.db, conv.id);
    expect(afterReopen?.status).toBe('open');

    // 9. Agent resolves again
    const resolvedAgain = await p.conversations.resolve(p.db, conv.id, agent.id);
    expect(resolvedAgain.ok).toBe(true);
    if (resolvedAgain.ok) {
      expect(resolvedAgain.conversation.status).toBe('resolved');
      expect(resolvedAgain.conversation.resolvedAt).toBeInstanceOf(Date);
    }

    // 10. Verify full audit trail
    const events = await p.conversations.getEvents(p.db, conv.id);
    const eventTypes = events.map((e) => e.eventType);

    // Should contain: created, assigned, participant_joined, resolved, reopened (from manual reopen for second resolve), resolved
    expect(eventTypes).toContain('created');
    expect(eventTypes).toContain('assigned');
    expect(eventTypes).toContain('resolved');

    // There should be two resolved events
    const resolvedEvents = events.filter((e) => e.eventType === 'resolved');
    expect(resolvedEvents.length).toBe(2);

    // Timestamps should be chronological
    for (let i = 1; i < events.length; i++) {
      expect(events[i].createdAt.getTime()).toBeGreaterThanOrEqual(events[i - 1].createdAt.getTime());
    }
  });

  it('firstReplyAt is only set once (on first agent public message)', async () => {
    const agent = p.users.create({ type: 'human_agent', name: 'Agent' });
    const contact = p.users.create({ type: 'contact', name: 'Contact' });

    const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });
    const hookDb = p.createHookDb();

    // Internal message should NOT set firstReplyAt
    const internalMsg = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: agent.id,
      visibility: 'internal' as const,
    };
    await p.hooks.onMessageCreated(hookDb, internalMsg, {
      id: conv.id,
      status: 'open',
      assigneeId: agent.id,
      firstReplyAt: null,
    });
    const afterInternal = await p.conversations.getById(p.db, conv.id);
    expect(afterInternal?.firstReplyAt).toBeNull();

    // Contact message should NOT set firstReplyAt
    const contactMsg = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: contact.id,
      visibility: 'public' as const,
    };
    await p.hooks.onMessageCreated(hookDb, contactMsg, {
      id: conv.id,
      status: 'open',
      assigneeId: agent.id,
      firstReplyAt: null,
    });
    const afterContact = await p.conversations.getById(p.db, conv.id);
    expect(afterContact?.firstReplyAt).toBeNull();

    // First public agent message SHOULD set firstReplyAt
    const publicMsg = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: agent.id,
      visibility: 'public' as const,
    };
    await p.hooks.onMessageCreated(hookDb, publicMsg, {
      id: conv.id,
      status: 'open',
      assigneeId: agent.id,
      firstReplyAt: null,
    });
    const afterPublic = await p.conversations.getById(p.db, conv.id);
    expect(afterPublic?.firstReplyAt).toBeInstanceOf(Date);
    const firstReplyTime = afterPublic!.firstReplyAt!;

    // Second public agent message should NOT change firstReplyAt
    const secondPublicMsg = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: agent.id,
      visibility: 'public' as const,
    };
    await p.hooks.onMessageCreated(hookDb, secondPublicMsg, {
      id: conv.id,
      status: 'open',
      assigneeId: agent.id,
      firstReplyAt: firstReplyTime,
    });
    const afterSecond = await p.conversations.getById(p.db, conv.id);
    expect(afterSecond?.firstReplyAt).toEqual(firstReplyTime);
  });

  it('metrics reflect the full lifecycle accurately', async () => {
    const agent = p.users.create({ type: 'human_agent', name: 'Agent' });

    // Create and resolve 3 conversations
    for (let i = 0; i < 3; i++) {
      const conv = await p.conversations.create(p.db, {
        channelOrigin: 'web_chat',
        priority: i === 0 ? 'high' : 'medium',
      });
      await p.conversations.assign(p.db, conv.id, agent.id, agent.id);
      await p.conversations.resolve(p.db, conv.id, agent.id);
    }

    // Create 1 open conversation (not resolved)
    await p.conversations.create(p.db, { channelOrigin: 'email' });

    const { data: all } = await p.conversations.list(p.db, {});
    const metrics = p.metrics.compute(all);

    expect(metrics.total).toBe(4);
    expect(metrics.byStatus.resolved).toBe(3);
    expect(metrics.byStatus.open).toBe(1);
    expect(metrics.avgResolutionMs).not.toBeNull();
    expect(metrics.avgResolutionMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Flow 2: Email Inbound → Thread → Reply
// ---------------------------------------------------------------------------

describe('Flow 2: Email Inbound → Thread → Reply', () => {
  /**
   * In-memory threading DB for email threading tests.
   * Tracks channel-conversation records that map emails to conversations.
   */
  function createThreadingDb(): ThreadingDb & {
    store: ChannelConversationRecord[];
    addRecord(record: ChannelConversationRecord): void;
  } {
    const store: ChannelConversationRecord[] = [];

    return {
      store,
      addRecord(record: ChannelConversationRecord) {
        store.push(record);
      },
      async findChannelConversationByExternalId(externalId: string) {
        return store.find((r) => r.externalId === externalId) ?? null;
      },
      async findChannelConversationsByMetadata(key: string, value: string) {
        return store.filter((r) => {
          const metadata = r.externalMetadata as Record<string, unknown>;
          const values = metadata[key];
          if (Array.isArray(values)) return values.includes(value);
          return values === value;
        });
      },
      async findChannelConversationBySubjectAndSender(_subject: string, _senderEmail: string) {
        return null; // Not used in these tests
      },
      async getChannelConversationsByConversation(conversationId: string) {
        return store.filter((r) => r.conversationId === conversationId);
      },
    };
  }

  it('full flow: inbound email → parse → create conversation → reply arrives → threaded into same conversation', async () => {
    const adapter = new EmailAdapter(
      { send: async () => ({ success: true, messageId: 'sent-1' }) },
      createThreadingDb(),
    );

    // 1. Inbound email webhook arrives (Postmark format)
    const postmarkPayload = {
      FromFull: { Email: 'customer@example.com', Name: 'Jane Builder' },
      ToFull: [{ Email: 'support@buildpass.com' }],
      Subject: 'Help with my building permit',
      TextBody: 'I need help with permit #12345',
      HtmlBody: '<p>I need help with <strong>permit #12345</strong></p>',
      MessageID: 'original-msg-001@example.com',
      Headers: [],
    };

    // 2. Email is parsed
    const parsed = adapter.receive(postmarkPayload);

    expect(parsed.from).toBe('customer@example.com');
    expect(parsed.fromName).toBe('Jane Builder');
    expect(parsed.to).toEqual(['support@buildpass.com']);
    expect(parsed.subject).toBe('Help with my building permit');
    expect(parsed.bodyText).toBe('I need help with permit #12345');
    expect(parsed.messageId).toBe('original-msg-001@example.com');

    // 3. HTML is sanitized
    expect(parsed.bodyHtml).toBeDefined();
    expect(parsed.bodyHtml).toContain('<p>');
    expect(parsed.bodyHtml).toContain('<strong>');
    expect(parsed.bodyHtml).not.toContain('<script>');

    // 4. New conversation created from email
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: parsed.subject,
      metadata: {
        emailMessageId: parsed.messageId,
        fromEmail: parsed.from,
        fromName: parsed.fromName,
      },
    });

    expect(conv.status).toBe('open');
    expect(conv.channelOrigin).toBe('email');

    // 5. Register the channel-conversation record for threading
    const threadingDb = createThreadingDb();
    threadingDb.addRecord({
      id: crypto.randomUUID(),
      channelId: 'email-channel-1',
      conversationId: conv.id,
      externalId: parsed.messageId,
      externalMetadata: { messageIds: [parsed.messageId] },
    });

    // 6. Agent replies (sets up for threading)
    const agent = p.users.create({ type: 'human_agent', name: 'Joanna' });
    await p.conversations.assign(p.db, conv.id, agent.id, agent.id);

    // 7. Another email arrives with In-Reply-To header matching the first
    const replyPayload = {
      FromFull: { Email: 'customer@example.com', Name: 'Jane Builder' },
      ToFull: [{ Email: 'support@buildpass.com' }],
      Subject: 'Re: Help with my building permit',
      TextBody: 'Thanks, but I also need info about the inspection schedule',
      HtmlBody: '<p>Thanks, but I also need info about the <em>inspection schedule</em></p>',
      MessageID: 'reply-msg-002@example.com',
      Headers: [
        { Name: 'In-Reply-To', Value: `<${parsed.messageId}>` },
        { Name: 'References', Value: `<${parsed.messageId}>` },
      ],
    };

    const parsedReply = adapter.receive(replyPayload);

    // 8. Verify threading: In-Reply-To points to original message
    expect(parsedReply.inReplyTo).toBe(parsed.messageId);
    expect(parsedReply.references).toContain(parsed.messageId);

    // 9. Thread matching finds the existing conversation
    const threadMatch = await matchToConversation(threadingDb, {
      messageId: parsedReply.messageId,
      inReplyTo: parsedReply.inReplyTo,
      references: parsedReply.references,
      from: parsedReply.from,
      subject: parsedReply.subject,
    });

    expect(threadMatch).not.toBeNull();
    expect(threadMatch!.conversationId).toBe(conv.id);

    // 10. Reply is added to the same conversation (not a new one)
    const allConversations = await p.conversations.list(p.db, {});
    expect(allConversations.total).toBe(1);
  });

  it('email HTML sanitization strips dangerous content', () => {
    // Script tags
    const withScript = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const sanitized = sanitizeInboundHtml(withScript);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('<p>');

    // Iframe
    const withIframe = '<p>Content</p><iframe src="https://evil.com"></iframe>';
    const iframeSanitized = sanitizeInboundHtml(withIframe);
    expect(iframeSanitized).not.toContain('<iframe');

    // Event handlers
    const withHandler = '<img src="x" onerror="alert(1)">';
    const handlerSanitized = sanitizeInboundHtml(withHandler);
    expect(handlerSanitized).not.toContain('onerror');

    // Safe content passes through
    const safe = '<p>Hello <strong>world</strong></p><a href="https://buildpass.com">link</a>';
    const safeSanitized = sanitizeInboundHtml(safe);
    expect(safeSanitized).toContain('<p>');
    expect(safeSanitized).toContain('<strong>');
    expect(safeSanitized).toContain('href="https://buildpass.com"');
  });

  it('email addresses are normalized to lowercase', () => {
    const adapter = new EmailAdapter(
      { send: async () => ({ success: true }) },
      createThreadingDb(),
    );

    const payload = {
      FromFull: { Email: 'Customer@EXAMPLE.COM', Name: 'Jane' },
      ToFull: [{ Email: 'Support@BuildPass.COM' }],
      Subject: 'Test',
      TextBody: 'test',
      Headers: [],
    };

    const parsed = adapter.receive(payload);
    expect(parsed.from).toBe('customer@example.com');
    expect(parsed.to).toEqual(['support@buildpass.com']);
  });

  it('normalises email subjects (strips Re:/Fwd: prefixes)', () => {
    expect(normaliseSubject('Re: Help with permit')).toBe('help with permit');
    expect(normaliseSubject('RE: RE: Help with permit')).toBe('help with permit');
    expect(normaliseSubject('Fwd: Re: Help with permit')).toBe('help with permit');
    expect(normaliseSubject('FW: Fwd: Re: Help with permit')).toBe('help with permit');
    expect(normaliseSubject('Help with permit')).toBe('help with permit');
  });

  it('threading falls back through strategies: In-Reply-To → References → null', async () => {
    const threadingDb = createThreadingDb();

    const convId = crypto.randomUUID();
    const originalMessageId = 'msg-100@example.com';

    threadingDb.addRecord({
      id: crypto.randomUUID(),
      channelId: 'email-1',
      conversationId: convId,
      externalId: originalMessageId,
      externalMetadata: { messageIds: [originalMessageId] },
    });

    // Strategy 1: Match by In-Reply-To
    const match1 = await matchToConversation(threadingDb, {
      messageId: 'new-msg@example.com',
      inReplyTo: originalMessageId,
      from: 'anyone@example.com',
      subject: 'anything',
    });
    expect(match1?.conversationId).toBe(convId);

    // Strategy 2: Match by References (when In-Reply-To is missing)
    const match2 = await matchToConversation(threadingDb, {
      messageId: 'new-msg-2@example.com',
      references: [originalMessageId],
      from: 'anyone@example.com',
      subject: 'anything',
    });
    expect(match2?.conversationId).toBe(convId);

    // Strategy 4: No match when nothing matches
    const noMatch = await matchToConversation(threadingDb, {
      messageId: 'completely-new@example.com',
      from: 'stranger@example.com',
      subject: 'Brand new subject',
    });
    expect(noMatch).toBeNull();
  });

  it('SendGrid format is also parsed correctly', () => {
    const adapter = new EmailAdapter(
      { send: async () => ({ success: true }) },
      createThreadingDb(),
    );

    const sendGridPayload = {
      from: 'Jane Builder <jane@example.com>',
      to: 'support@buildpass.com',
      subject: 'SendGrid email test',
      text: 'Hello from SendGrid',
      html: '<p>Hello from <b>SendGrid</b></p>',
      headers: 'Message-ID: <sg-msg-001@example.com>\r\nIn-Reply-To: <prev-msg@example.com>',
    };

    const parsed = adapter.receive(sendGridPayload);

    expect(parsed.from).toBe('jane@example.com');
    expect(parsed.fromName).toBe('Jane Builder');
    expect(parsed.subject).toBe('SendGrid email test');
    expect(parsed.bodyText).toBe('Hello from SendGrid');
    expect(parsed.messageId).toBe('sg-msg-001@example.com');
    expect(parsed.inReplyTo).toBe('prev-msg@example.com');
  });
});

// ---------------------------------------------------------------------------
// Flow 3: Assignment + Routing + Teams
// ---------------------------------------------------------------------------

describe('Flow 3: Assignment + Routing + Teams', () => {
  it('full flow: routing rule → team assignment → round-robin distribution', async () => {
    // 1. Create 3 agents
    const agentA = p.users.create({ type: 'human_agent', name: 'Agent A' });
    const agentB = p.users.create({ type: 'human_agent', name: 'Agent B' });
    const agentC = p.users.create({ type: 'human_agent', name: 'Agent C' });

    // 2. Create a team with 3 agents
    const supportTeam = await p.routingDb.createTeam({ name: 'Billing Support' });
    await p.routingDb.addTeamMember(supportTeam.id, agentA.id, 'member');
    await p.routingDb.addTeamMember(supportTeam.id, agentB.id, 'member');
    await p.routingDb.addTeamMember(supportTeam.id, agentC.id, 'member');

    // 3. Create a routing rule with keyword conditions
    const billingRule: RoutingRule = {
      id: 'rule-billing',
      name: 'Billing keyword routing',
      priority: 1,
      conditions: { keywords: ['billing', 'invoice', 'payment'] },
      action: 'assign_team',
      targetType: 'team',
      targetId: supportTeam.id,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rules: RoutingRule[] = [billingRule];

    // 4. First conversation arrives matching the keyword
    const conv1 = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Question about my billing statement',
    });
    const routable1: RoutableConversation = {
      id: conv1.id,
      channelOrigin: conv1.channelOrigin,
      subject: conv1.subject,
    };

    const match1 = p.routing.evaluate(routable1, rules);
    expect(match1).not.toBeNull();
    expect(match1!.action).toBe('assign_team');
    expect(match1!.targetId).toBe(supportTeam.id);

    // 5. Execute action → round-robin selects first agent
    const result1 = await p.routing.executeAction(
      p.routingDb,
      conv1.id,
      match1!.action,
      match1!.targetType,
      match1!.targetId,
    );
    expect(result1.assignedTo).toBe(agentA.id);

    // 6. Second conversation → round-robin selects second agent
    const conv2 = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'I have an invoice question',
    });
    const routable2: RoutableConversation = {
      id: conv2.id,
      channelOrigin: conv2.channelOrigin,
      subject: conv2.subject,
    };

    const match2 = p.routing.evaluate(routable2, rules);
    expect(match2).not.toBeNull();

    const result2 = await p.routing.executeAction(
      p.routingDb,
      conv2.id,
      match2!.action,
      match2!.targetType,
      match2!.targetId,
    );
    expect(result2.assignedTo).toBe(agentB.id);

    // 7. Third conversation → third agent
    const conv3 = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Payment not received',
    });
    const routable3: RoutableConversation = {
      id: conv3.id,
      channelOrigin: conv3.channelOrigin,
      subject: conv3.subject,
    };

    const match3 = p.routing.evaluate(routable3, rules);
    expect(match3).not.toBeNull();

    const result3 = await p.routing.executeAction(
      p.routingDb,
      conv3.id,
      match3!.action,
      match3!.targetType,
      match3!.targetId,
    );
    expect(result3.assignedTo).toBe(agentC.id);

    // 8. Fourth conversation → back to first agent (wrap-around)
    const conv4 = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Another billing inquiry',
    });
    const routable4: RoutableConversation = {
      id: conv4.id,
      channelOrigin: conv4.channelOrigin,
      subject: conv4.subject,
    };

    const match4 = p.routing.evaluate(routable4, rules);
    expect(match4).not.toBeNull();

    const result4 = await p.routing.executeAction(
      p.routingDb,
      conv4.id,
      match4!.action,
      match4!.targetType,
      match4!.targetId,
    );
    expect(result4.assignedTo).toBe(agentA.id);

    // 9. Verify: even distribution
    const assignments = [result1, result2, result3, result4].map((r) => r.assignedTo);
    expect(assignments).toEqual([agentA.id, agentB.id, agentC.id, agentA.id]);

    // Verify routing DB assignments were recorded
    expect(getRoutingAssignment(conv1.id)).toBe(agentA.id);
    expect(getRoutingAssignment(conv2.id)).toBe(agentB.id);
    expect(getRoutingAssignment(conv3.id)).toBe(agentC.id);
    expect(getRoutingAssignment(conv4.id)).toBe(agentA.id);
  });

  it('non-matching conversations are not routed', async () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-billing',
        name: 'Billing routing',
        priority: 1,
        conditions: { keywords: ['billing'] },
        action: 'assign_team',
        targetType: 'team',
        targetId: 'some-team-id',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'General question about construction',
    });

    const match = p.routing.evaluate(
      { id: conv.id, channelOrigin: conv.channelOrigin, subject: conv.subject },
      rules,
    );

    expect(match).toBeNull();
  });

  it('multiple rules evaluated in priority order, highest priority wins', async () => {
    const agentGeneral = p.users.create({ type: 'human_agent', name: 'General Agent' });
    const agentBilling = p.users.create({ type: 'human_agent', name: 'Billing Agent' });

    const rules: RoutingRule[] = [
      {
        id: 'rule-catchall',
        name: 'Catch-all email',
        priority: 10,
        conditions: { channel: 'email' },
        action: 'assign_agent',
        targetType: 'user',
        targetId: agentGeneral.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-billing',
        name: 'Billing priority',
        priority: 1,
        conditions: { keywords: ['billing'] },
        action: 'assign_agent',
        targetType: 'user',
        targetId: agentBilling.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Email about billing matches both rules, but billing has higher priority (lower number)
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Billing question from email',
    });

    const match = p.routing.evaluate(
      { id: conv.id, channelOrigin: conv.channelOrigin, subject: conv.subject },
      rules,
    );

    expect(match!.ruleId).toBe('rule-billing');
    expect(match!.targetId).toBe(agentBilling.id);

    // Execute the assignment
    await p.routing.executeAction(
      p.routingDb,
      conv.id,
      match!.action,
      match!.targetType,
      match!.targetId,
    );
    expect(getRoutingAssignment(conv.id)).toBe(agentBilling.id);
  });

  it('team lead role is tracked separately from members', async () => {
    const lead = p.users.create({ type: 'human_agent', name: 'Team Lead' });
    const member1 = p.users.create({ type: 'human_agent', name: 'Member 1' });
    const member2 = p.users.create({ type: 'human_agent', name: 'Member 2' });

    const team = await p.routingDb.createTeam({ name: 'Support Team' });
    await p.routingDb.addTeamMember(team.id, lead.id, 'lead');
    await p.routingDb.addTeamMember(team.id, member1.id, 'member');
    await p.routingDb.addTeamMember(team.id, member2.id, 'member');

    const members = await p.routingDb.getTeamMembers(team.id);
    expect(members).toHaveLength(3);

    const leads = members.filter((m) => m.role === 'lead');
    expect(leads).toHaveLength(1);
    expect(leads[0].userId).toBe(lead.id);

    const regularMembers = members.filter((m) => m.role === 'member');
    expect(regularMembers).toHaveLength(2);
  });

  it('round-robin wraps correctly through 8 consecutive assignments', async () => {
    const agents = Array.from({ length: 3 }, (_, i) =>
      p.users.create({ type: 'human_agent', name: `Agent ${i}` }),
    );

    const team = await p.routingDb.createTeam({ name: 'Rotation Team' });
    for (const agent of agents) {
      await p.routingDb.addTeamMember(team.id, agent.id, 'member');
    }

    const assigned: string[] = [];
    for (let i = 0; i < 8; i++) {
      const agentId = await p.routing.roundRobin(p.routingDb, team.id);
      expect(agentId).not.toBeNull();
      assigned.push(agentId!);
    }

    // Verify wrapping pattern: 0,1,2,0,1,2,0,1
    expect(assigned).toEqual([
      agents[0].id,
      agents[1].id,
      agents[2].id,
      agents[0].id,
      agents[1].id,
      agents[2].id,
      agents[0].id,
      agents[1].id,
    ]);

    // Verify even distribution (2 or 3 per agent)
    for (const agent of agents) {
      const count = assigned.filter((id) => id === agent.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('combined flow: routing + assignment + conversation lifecycle', async () => {
    const agent = p.users.create({ type: 'human_agent', name: 'Support Agent' });
    const team = await p.routingDb.createTeam({ name: 'General Support' });
    await p.routingDb.addTeamMember(team.id, agent.id, 'member');

    const rules: RoutingRule[] = [
      {
        id: 'rule-all-email',
        name: 'All email to support',
        priority: 1,
        conditions: { channel: 'email' },
        action: 'assign_team',
        targetType: 'team',
        targetId: team.id,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Conversation arrives
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Need help',
    });

    // Routing evaluates and assigns
    const match = p.routing.evaluate(
      { id: conv.id, channelOrigin: conv.channelOrigin, subject: conv.subject },
      rules,
    );
    expect(match).not.toBeNull();

    const result = await p.routing.executeAction(
      p.routingDb,
      conv.id,
      match!.action,
      match!.targetType,
      match!.targetId,
    );
    expect(result.assignedTo).toBe(agent.id);

    // Also assign via conversation module to track in conversation DB
    await p.conversations.assign(p.db, conv.id, agent.id, agent.id);

    // Agent resolves
    const resolved = await p.conversations.resolve(p.db, conv.id, agent.id);
    expect(resolved.ok).toBe(true);

    // Verify end state
    const final = await p.conversations.getById(p.db, conv.id);
    expect(final?.status).toBe('resolved');
    expect(final?.assigneeId).toBe(agent.id);

    // Verify audit trail has assignment + resolution
    const events = await p.conversations.getEvents(p.db, conv.id);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('created');
    expect(eventTypes).toContain('assigned');
    expect(eventTypes).toContain('resolved');
  });
});
