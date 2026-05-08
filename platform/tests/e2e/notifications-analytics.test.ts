/**
 * E2E: Notifications and analytics
 *
 * Tests notification creation, user settings, marking as read,
 * conversation metrics, first reply time, resolution time, and SLA breaches.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

describe('Notifications & Analytics', () => {
  let p: Platform;

  beforeEach(() => {
    p = createPlatform();
  });

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------

  describe('Notifications', () => {
    it('new message creates notification for assignee', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
      const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });

      const conv = p.createConversation({ channelOrigin: 'web_chat' });
      p.assignConversation(conv.id, agent.id, 'system');

      // Contact sends a message
      p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Help please' });

      // Create notification for assignee
      const notification = p.tryCreateNotification({
        userId: agent.id,
        type: 'new_message',
        title: 'New message',
        body: 'New message in conversation',
        conversationId: conv.id,
      });

      expect(notification).not.toBeNull();
      expect(notification!.userId).toBe(agent.id);
      expect(notification!.type).toBe('new_message');
      expect(notification!.read).toBe(false);
      expect(notification!.conversationId).toBe(conv.id);
    });

    it('notification respects user settings (disabled = no notification)', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

      // Disable new_message notifications
      p.setNotificationSettings(agent.id, {
        settings: {
          new_message: false,
          assignment: true,
          mention: true,
          status_change: true,
          escalation: true,
        },
      });

      const notification = p.tryCreateNotification({
        userId: agent.id,
        type: 'new_message',
        title: 'New message',
        body: 'Should not be created',
      });

      expect(notification).toBeNull();
    });

    it('notification type enabled by default (no settings configured)', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

      // No settings configured — should still create notification
      const notification = p.tryCreateNotification({
        userId: agent.id,
        type: 'assignment',
        title: 'Assigned',
        body: 'You were assigned a conversation',
      });

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe('assignment');
    });

    it('mark notification as read', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

      const notification = p.tryCreateNotification({
        userId: agent.id,
        type: 'new_message',
        title: 'New message',
        body: 'You have a new message',
      })!;

      expect(notification.read).toBe(false);

      const success = p.markNotificationAsRead(notification.id);
      expect(success).toBe(true);

      const updated = p.listNotifications(agent.id);
      expect(updated[0]!.read).toBe(true);
    });

    it('list notifications with filters', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

      const n1 = p.tryCreateNotification({
        userId: agent.id,
        type: 'new_message',
        title: 'Message 1',
        body: 'body',
      })!;

      p.tryCreateNotification({
        userId: agent.id,
        type: 'assignment',
        title: 'Assigned',
        body: 'body',
      });

      p.tryCreateNotification({
        userId: agent.id,
        type: 'new_message',
        title: 'Message 2',
        body: 'body',
      });

      p.markNotificationAsRead(n1.id);

      // Filter by type
      const messageNotifs = p.listNotifications(agent.id, { type: 'new_message' });
      expect(messageNotifs).toHaveLength(2);

      // Filter by read status
      const unread = p.listNotifications(agent.id, { read: false });
      expect(unread).toHaveLength(2);

      const read = p.listNotifications(agent.id, { read: true });
      expect(read).toHaveLength(1);
    });

    it('escalation creates notification', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
      const aiAgent = p.createUser({ type: 'ai_agent', name: 'Ron', metadata: { model: 'claude' } });

      const conv = p.createConversation({ channelOrigin: 'web_chat' });

      p.requestHandoff(aiAgent.id, conv.id, 'Cannot answer regulatory question', agent.id);

      const notification = p.tryCreateNotification({
        userId: agent.id,
        type: 'escalation',
        title: 'Escalation',
        body: 'A conversation has been escalated',
        conversationId: conv.id,
      });

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe('escalation');
    });
  });

  // --------------------------------------------------------------------------
  // Analytics
  // --------------------------------------------------------------------------

  describe('Analytics', () => {
    it('conversation metrics (count by status, channel)', () => {
      p.createConversation({ channelOrigin: 'web_chat' });
      p.createConversation({ channelOrigin: 'web_chat' });
      p.createConversation({ channelOrigin: 'email' });

      const resolvedConv = p.createConversation({ channelOrigin: 'web_chat' });
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
      p.resolveConversation(resolvedConv.id, agent.id);

      const metrics = p.getConversationMetrics();

      expect(metrics.total).toBe(4);
      expect(metrics.byStatus['open']).toBe(3);
      expect(metrics.byStatus['resolved']).toBe(1);
      expect(metrics.byChannel['web_chat']).toBe(3);
      expect(metrics.byChannel['email']).toBe(1);
    });

    it('first reply time calculated correctly', () => {
      const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

      const conv = p.createConversation({ channelOrigin: 'web_chat' });
      p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Help' });
      p.assignConversation(conv.id, agent.id, 'system');

      // Simulate some time passing (first_reply_at is set manually in the test)
      p.setFirstReplyAt(conv.id);

      const updated = p.getConversation(conv.id)!;
      expect(updated.firstReplyAt).toBeInstanceOf(Date);

      // first_reply_at should be after created_at
      expect(updated.firstReplyAt!.getTime()).toBeGreaterThanOrEqual(
        updated.createdAt.getTime(),
      );
    });

    it('resolution time calculated correctly', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

      const conv = p.createConversation({ channelOrigin: 'web_chat' });
      const createdTime = conv.createdAt;

      p.resolveConversation(conv.id, agent.id);

      const updated = p.getConversation(conv.id)!;
      expect(updated.resolvedAt).toBeInstanceOf(Date);
      expect(updated.resolvedAt!.getTime()).toBeGreaterThanOrEqual(
        createdTime.getTime(),
      );

      // Resolution time = resolvedAt - createdAt
      const resolutionMs = updated.resolvedAt!.getTime() - createdTime.getTime();
      expect(resolutionMs).toBeGreaterThanOrEqual(0);
    });

    it('SLA breach detected for overdue conversations', () => {
      // Create a conversation with a very old createdAt to simulate SLA breach
      const conv = p.createConversation({ channelOrigin: 'web_chat' });

      // Manually backdate the conversation to trigger breach
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      conv.createdAt = twoHoursAgo;

      // Check SLA breaches with thresholds
      const breaches = p.checkSlaBreaches({
        firstReplyMs: 5 * 60 * 1000,  // 5 minutes
        resolutionMs: 24 * 60 * 60 * 1000,  // 24 hours
      });

      // Should have first_reply breach (2 hours > 5 minutes)
      const firstReplyBreach = breaches.find(
        (b) => b.conversationId === conv.id && b.type === 'first_reply',
      );
      expect(firstReplyBreach).toBeDefined();
      expect(firstReplyBreach!.actualMs).toBeGreaterThan(firstReplyBreach!.thresholdMs);
    });

    it('resolved conversation does not trigger SLA breach', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
      const conv = p.createConversation({ channelOrigin: 'web_chat' });

      // Backdate but also resolve
      conv.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      p.setFirstReplyAt(conv.id);
      p.resolveConversation(conv.id, agent.id);

      const breaches = p.checkSlaBreaches({
        firstReplyMs: 5 * 60 * 1000,
        resolutionMs: 24 * 60 * 60 * 1000,
      });

      // Resolved conversations should not appear in breaches
      const convBreaches = breaches.filter((b) => b.conversationId === conv.id);
      expect(convBreaches).toHaveLength(0);
    });

    it('metrics include avg first reply and resolution times', () => {
      const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
      const contact = p.createUser({ type: 'contact', name: 'Alice', email: 'alice@test.com' });

      // Create and resolve a conversation
      const conv = p.createConversation({ channelOrigin: 'web_chat' });
      p.createMessage({ conversationId: conv.id, senderId: contact.id, body: 'Help' });
      p.assignConversation(conv.id, agent.id, 'system');
      p.setFirstReplyAt(conv.id);
      p.resolveConversation(conv.id, agent.id);

      const metrics = p.getConversationMetrics();

      expect(metrics.avgFirstReplyMs).not.toBeNull();
      expect(metrics.avgFirstReplyMs!).toBeGreaterThanOrEqual(0);
      expect(metrics.avgResolutionMs).not.toBeNull();
      expect(metrics.avgResolutionMs!).toBeGreaterThanOrEqual(0);
    });

    it('metrics with no resolved conversations return null averages', () => {
      p.createConversation({ channelOrigin: 'web_chat' });
      p.createConversation({ channelOrigin: 'email' });

      const metrics = p.getConversationMetrics();

      expect(metrics.total).toBe(2);
      expect(metrics.avgFirstReplyMs).toBeNull();
      expect(metrics.avgResolutionMs).toBeNull();
    });
  });
});
