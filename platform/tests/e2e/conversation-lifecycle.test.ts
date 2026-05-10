/**
 * E2E: Conversation lifecycle
 *
 * Full lifecycle: create contact -> first message -> conversation created ->
 * agent assigned -> agent replies -> resolve -> reopen on new message -> snooze
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Conversation lifecycle', () => {
  it('creates a contact, starts a conversation, assigns an agent, then resolves', async () => {
    // 1. Create contact and agent
    const contact = p.users.create({ type: 'contact', name: 'Jane Builder', email: 'jane@example.com' });
    const agent = p.users.create({ type: 'human_agent', name: 'Support Agent', email: 'agent@buildpass.com' });

    // 2. Contact sends first message -> conversation created
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Help with permit application',
    });

    expect(conv.status).toBe('open');
    expect(conv.displayId).toBeGreaterThan(0);
    expect(conv.channelOrigin).toBe('web_chat');

    // 3. Assign agent
    const updated = await p.conversations.assign(p.db, conv.id, agent.id, agent.id);

    expect(updated?.assigneeId).toBe(agent.id);

    // 4. Verify conversation is retrievable
    const fetched = await p.conversations.getById(p.db, conv.id);
    expect(fetched?.id).toBe(conv.id);
    expect(fetched?.assigneeId).toBe(agent.id);

    // 5. Resolve conversation
    const resolved = await p.conversations.resolve(p.db, conv.id, agent.id);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.conversation.status).toBe('resolved');
      expect(resolved.conversation.resolvedAt).toBeInstanceOf(Date);
    }

    // 6. Verify events were created
    const events = await p.conversations.getEvents(p.db, conv.id);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('created');
    expect(eventTypes).toContain('resolved');
  });

  it('reopens a resolved conversation when contact sends a new message', async () => {
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Billing question',
    });

    // Resolve
    const resolved = await p.conversations.resolve(p.db, conv.id, 'agent-1');
    expect(resolved.ok).toBe(true);

    // Verify it's resolved
    const afterResolve = await p.conversations.getById(p.db, conv.id);
    expect(afterResolve?.status).toBe('resolved');

    // Contact sends new message -> reopen
    const reopened = await p.conversations.reopen(p.db, conv.id, 'contact-1');
    expect(reopened.ok).toBe(true);
    if (reopened.ok) {
      expect(reopened.conversation.status).toBe('open');
    }

    // Verify events include both resolved and reopened
    const events = await p.conversations.getEvents(p.db, conv.id);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('resolved');
    expect(eventTypes).toContain('reopened');
  });

  it('snoozes and auto-unsnoozes a conversation', async () => {
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Follow up later',
    });

    // Snooze for 1 hour
    const until = new Date(Date.now() + 60 * 60 * 1000);
    const snoozed = await p.conversations.snooze(p.db, conv.id, 'agent-1', until);
    expect(snoozed.ok).toBe(true);
    if (snoozed.ok) {
      expect(snoozed.conversation.status).toBe('snoozed');
      expect(snoozed.conversation.snoozedUntil).toEqual(until);
    }

    // Unsnooze (simulating BullMQ job)
    const unsnoozed = await p.conversations.unsnooze(p.db, conv.id, 'system');
    expect(unsnoozed.ok).toBe(true);
    if (unsnoozed.ok) {
      expect(unsnoozed.conversation.status).toBe('open');
      expect(unsnoozed.conversation.snoozedUntil).toBeNull();
    }

    // Verify event chain
    const events = await p.conversations.getEvents(p.db, conv.id);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('snoozed');
    expect(eventTypes).toContain('reopened');
  });

  it('tracks the full lifecycle: open -> pending -> snoozed -> open -> resolved -> open', async () => {
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Complex ticket',
      priority: 'high',
    });

    expect(conv.status).toBe('open');
    expect(conv.priority).toBe('high');

    // Validate all allowed transitions from open
    const fromOpen = p.conversations.allowedTransitions('open');
    expect(fromOpen).toContain('pending');
    expect(fromOpen).toContain('snoozed');
    expect(fromOpen).toContain('resolved');
    expect(fromOpen).not.toContain('open');

    // open -> snoozed (skipping pending for this path)
    const until = new Date(Date.now() + 30 * 60 * 1000);
    const snoozed = await p.conversations.snooze(p.db, conv.id, 'agent-1', until);
    expect(snoozed.ok).toBe(true);

    // snoozed -> open
    const unsnoozed = await p.conversations.unsnooze(p.db, conv.id, 'system');
    expect(unsnoozed.ok).toBe(true);

    // open -> resolved
    const resolved = await p.conversations.resolve(p.db, conv.id, 'agent-1');
    expect(resolved.ok).toBe(true);

    // resolved -> open (reopen)
    const reopened = await p.conversations.reopen(p.db, conv.id, 'contact-1');
    expect(reopened.ok).toBe(true);

    // Final state
    const final = await p.conversations.getById(p.db, conv.id);
    expect(final?.status).toBe('open');
  });

  it('full cross-module flow: create -> assign -> handoff -> resolve -> metrics', async () => {
    // 1. Create users
    const contact = p.users.create({ type: 'contact', name: 'Builder Jane', email: 'jane@builder.com' });
    const ron = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const joanna = p.users.create({ type: 'human_agent', name: 'Joanna' });

    // 2. Contact starts conversation
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Complex legal compliance question',
      priority: 'high',
    });

    // 3. Ron is auto-assigned
    await p.conversations.assign(p.db, conv.id, ron.id, ron.id);

    // 4. Ron generates a copilot suggestion
    const suggestion = await p.agents.copilot.createSuggestion(p.db, {
      conversationId: conv.id,
      agentId: ron.id,
      suggestedReply: 'For legal compliance, you need...',
      confidence: 0.4,
      reasoning: 'Low confidence -- legal question outside expertise',
    });

    // 5. Low confidence -> Ron escalates to Joanna
    p.agents.handoff.seedAssignment(conv.id, ron.id);
    const handoff = await p.agents.handoff.requestHandoff(
      p.db,
      ron.id,
      conv.id,
      'Legal compliance outside AI expertise',
      joanna.id,
    );
    expect(handoff.toUserId).toBe(joanna.id);

    // 6. Dismiss the low-confidence suggestion
    await p.agents.copilot.dismiss(p.db, suggestion.id);
    const pending = await p.agents.copilot.listPending(p.db, conv.id);
    expect(pending).toHaveLength(0);

    // 7. Joanna is now assigned, resolves
    await p.conversations.assign(p.db, conv.id, joanna.id, joanna.id);
    const resolved = await p.conversations.resolve(p.db, conv.id, joanna.id);
    expect(resolved.ok).toBe(true);

    // 8. Compute metrics
    const { data: allConvs } = await p.conversations.list(p.db, {});
    const metrics = p.metrics.compute(allConvs);
    expect(metrics.total).toBe(1);
    expect(metrics.byStatus.resolved).toBe(1);
    expect(metrics.avgResolutionMs).not.toBeNull();

    // 9. Verify complete audit trail
    const events = await p.conversations.getEvents(p.db, conv.id);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('created');
    expect(eventTypes).toContain('resolved');

    // 10. Verify handoff event trail
    const handoffEvents = p.agents.handoff.getEvents();
    expect(handoffEvents.some((e) => e.eventType === 'escalated')).toBe(true);
  });

  it('lists conversations with filters', async () => {
    await p.conversations.create(p.db, { channelOrigin: 'email', priority: 'high' });
    await p.conversations.create(p.db, { channelOrigin: 'web_chat', priority: 'low' });
    await p.conversations.create(p.db, { channelOrigin: 'email', priority: 'medium' });

    // Filter by channel
    const emailOnly = await p.conversations.list(p.db, { channelOrigin: 'email' });
    expect(emailOnly.total).toBe(2);

    // Filter by priority
    const highPriority = await p.conversations.list(p.db, { priority: 'high' });
    expect(highPriority.total).toBe(1);

    // Pagination
    const page1 = await p.conversations.list(p.db, { limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(3);
  });
});
