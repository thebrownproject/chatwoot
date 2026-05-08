/**
 * E2E: Notifications and analytics
 *
 * Notification dispatch, settings, metrics, SLA.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Notifications', () => {
  it('creates a notification for a user', () => {
    const agent = p.users.create({ type: 'human_agent', name: 'Joanna' });

    const notification = p.notifications.create({
      userId: agent.id,
      type: 'new_message',
      title: 'New message',
      body: 'You have a new message in conversation #42',
      conversationId: 'conv-42',
    });

    expect(notification.userId).toBe(agent.id);
    expect(notification.type).toBe('new_message');
    expect(notification.read).toBe(false);
  });

  it('retrieves notifications for a user', () => {
    const agent = p.users.create({ type: 'human_agent', name: 'Agent' });

    p.notifications.create({
      userId: agent.id,
      type: 'new_message',
      title: 'Message 1',
      body: 'Body 1',
    });
    p.notifications.create({
      userId: agent.id,
      type: 'assignment',
      title: 'Assigned',
      body: 'You were assigned',
    });

    const notifications = p.notifications.getForUser(agent.id);
    expect(notifications).toHaveLength(2);
  });

  it('notifications are scoped to the correct user', () => {
    const agent1 = p.users.create({ type: 'human_agent', name: 'Agent 1' });
    const agent2 = p.users.create({ type: 'human_agent', name: 'Agent 2' });

    p.notifications.create({
      userId: agent1.id,
      type: 'new_message',
      title: 'For Agent 1',
      body: 'Body',
    });
    p.notifications.create({
      userId: agent2.id,
      type: 'new_message',
      title: 'For Agent 2',
      body: 'Body',
    });

    expect(p.notifications.getForUser(agent1.id)).toHaveLength(1);
    expect(p.notifications.getForUser(agent2.id)).toHaveLength(1);
    expect(p.notifications.getForUser(agent1.id)[0]!.title).toBe('For Agent 1');
  });

  describe('Notification settings', () => {
    it('returns default settings for a new user', () => {
      const agent = p.users.create({ type: 'human_agent', name: 'New Agent' });

      const settings = p.notifications.getSettings(agent.id);
      expect(settings.emailEnabled).toBe(true);
      expect(settings.pushEnabled).toBe(true);
    });

    it('updates notification settings', () => {
      const agent = p.users.create({ type: 'human_agent', name: 'Agent' });

      p.notifications.setSettings(agent.id, {
        emailEnabled: false,
        pushEnabled: true,
        settings: { new_message: true, assignment: false },
      });

      const settings = p.notifications.getSettings(agent.id);
      expect(settings.emailEnabled).toBe(false);
      expect(settings.settings.assignment).toBe(false);
    });
  });

  describe('Notification types', () => {
    it('supports all notification types', () => {
      const agent = p.users.create({ type: 'human_agent', name: 'Agent' });
      const types = ['new_message', 'assignment', 'mention', 'status_change', 'escalation'];

      for (const type of types) {
        p.notifications.create({
          userId: agent.id,
          type,
          title: `${type} notification`,
          body: `Test ${type}`,
        });
      }

      const all = p.notifications.getForUser(agent.id);
      expect(all).toHaveLength(5);

      const createdTypes = all.map((n) => n.type).sort();
      expect(createdTypes).toEqual(types.sort());
    });
  });
});

describe('Analytics / Metrics', () => {
  it('computes metrics for a set of conversations', async () => {
    // Create conversations with various statuses
    const conv1 = await p.conversations.create(p.db, { channelOrigin: 'email' });
    const conv2 = await p.conversations.create(p.db, { channelOrigin: 'web_chat' });
    const conv3 = await p.conversations.create(p.db, { channelOrigin: 'email' });

    await p.conversations.resolve(p.db, conv1.id, 'agent-1');

    // Fetch all conversations for metrics
    const { data: conversations } = await p.conversations.list(p.db, {});
    const metrics = p.metrics.compute(conversations);

    expect(metrics.total).toBe(3);
    expect(metrics.byStatus.open).toBe(2);
    expect(metrics.byStatus.resolved).toBe(1);
  });

  it('calculates average resolution time', async () => {
    // Create and immediately resolve a conversation
    const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });
    await p.conversations.resolve(p.db, conv.id, 'agent-1');

    const { data: conversations } = await p.conversations.list(p.db, {});
    const metrics = p.metrics.compute(conversations);

    // Resolution time should be non-null and very small (near 0)
    expect(metrics.avgResolutionMs).not.toBeNull();
    expect(metrics.avgResolutionMs!).toBeGreaterThanOrEqual(0);
  });

  it('returns null averages when no data available', () => {
    const metrics = p.metrics.compute([]);
    expect(metrics.total).toBe(0);
    expect(metrics.avgFirstReplyMs).toBeNull();
    expect(metrics.avgResolutionMs).toBeNull();
  });

  describe('SLA checks', () => {
    it('detects first reply SLA breach', async () => {
      // Create a conversation "in the past"
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      // Manually backdate createdAt for SLA testing
      const fetched = await p.conversations.getById(p.db, conv.id);
      if (fetched) {
        fetched.createdAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      }

      const { data: conversations } = await p.conversations.list(p.db, {});
      const breaches = p.metrics.checkSla(conversations, {
        firstReplyMs: 5 * 60 * 1000, // 5 minute SLA
        resolutionMs: 24 * 60 * 60 * 1000,
      });

      const firstReplyBreaches = breaches.filter((b) => b.type === 'first_reply');
      expect(firstReplyBreaches.length).toBeGreaterThanOrEqual(1);
    });

    it('no breaches for conversations within SLA', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });
      // Resolve immediately
      await p.conversations.resolve(p.db, conv.id, 'agent-1');

      const { data: conversations } = await p.conversations.list(p.db, {});
      const breaches = p.metrics.checkSla(conversations, {
        firstReplyMs: 5 * 60 * 1000,
        resolutionMs: 24 * 60 * 60 * 1000,
      });

      // Resolved conversations should not breach
      expect(breaches).toHaveLength(0);
    });

    it('detects resolution SLA breach', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      // Backdate for resolution breach
      const fetched = await p.conversations.getById(p.db, conv.id);
      if (fetched) {
        fetched.createdAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      }

      const { data: conversations } = await p.conversations.list(p.db, {});
      const breaches = p.metrics.checkSla(conversations, {
        firstReplyMs: 5 * 60 * 1000,
        resolutionMs: 24 * 60 * 60 * 1000, // 24 hour SLA
      });

      const resolutionBreaches = breaches.filter((b) => b.type === 'resolution');
      expect(resolutionBreaches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Metrics by status', () => {
    it('counts conversations by status correctly', async () => {
      await p.conversations.create(p.db, { channelOrigin: 'email' });
      await p.conversations.create(p.db, { channelOrigin: 'email' });
      const conv3 = await p.conversations.create(p.db, { channelOrigin: 'email' });
      const conv4 = await p.conversations.create(p.db, { channelOrigin: 'email' });

      await p.conversations.resolve(p.db, conv3.id, 'agent-1');
      await p.conversations.snooze(p.db, conv4.id, 'agent-1', new Date(Date.now() + 60000));

      const { data: conversations } = await p.conversations.list(p.db, {});
      const metrics = p.metrics.compute(conversations);

      expect(metrics.byStatus.open).toBe(2);
      expect(metrics.byStatus.resolved).toBe(1);
      expect(metrics.byStatus.snoozed).toBe(1);
    });
  });
});
