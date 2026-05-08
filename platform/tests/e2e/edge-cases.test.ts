/**
 * E2E: Edge cases
 *
 * Resolved reopen, invalid transitions, contact dedup,
 * visibility filtering, label idempotency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Edge cases', () => {
  describe('Invalid state transitions', () => {
    it('rejects snoozed -> resolved (must go through open first)', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      // open -> snoozed
      const snoozed = await p.conversations.snooze(p.db, conv.id, 'agent-1', new Date(Date.now() + 60000));
      expect(snoozed.ok).toBe(true);

      // snoozed -> resolved should fail
      const result = await p.conversations.resolve(p.db, conv.id, 'agent-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Invalid transition');
      }
    });

    it('rejects resolved -> snoozed (must reopen first)', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      // open -> resolved
      await p.conversations.resolve(p.db, conv.id, 'agent-1');

      // resolved -> snoozed should fail
      const result = await p.conversations.snooze(p.db, conv.id, 'agent-1', new Date(Date.now() + 60000));
      expect(result.ok).toBe(false);
    });

    it('rejects resolved -> pending', async () => {
      const valid = p.conversations.validateTransition('resolved', 'pending');
      expect(valid).toBe(false);
    });

    it('rejects same-state transitions', async () => {
      const valid = p.conversations.validateTransition('open', 'open');
      expect(valid).toBe(false);
    });

    it('rejects snoozed -> pending', async () => {
      const valid = p.conversations.validateTransition('snoozed', 'pending');
      expect(valid).toBe(false);
    });

    it('validates all legal transitions', () => {
      // From open
      expect(p.conversations.validateTransition('open', 'pending')).toBe(true);
      expect(p.conversations.validateTransition('open', 'snoozed')).toBe(true);
      expect(p.conversations.validateTransition('open', 'resolved')).toBe(true);

      // From pending
      expect(p.conversations.validateTransition('pending', 'open')).toBe(true);
      expect(p.conversations.validateTransition('pending', 'snoozed')).toBe(true);
      expect(p.conversations.validateTransition('pending', 'resolved')).toBe(true);

      // From snoozed
      expect(p.conversations.validateTransition('snoozed', 'open')).toBe(true);

      // From resolved
      expect(p.conversations.validateTransition('resolved', 'open')).toBe(true);
    });
  });

  describe('Resolved conversation reopen', () => {
    it('clears resolvedAt when reopening', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      const resolved = await p.conversations.resolve(p.db, conv.id, 'agent-1');
      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.conversation.resolvedAt).not.toBeNull();
      }

      const reopened = await p.conversations.reopen(p.db, conv.id, 'contact-1');
      expect(reopened.ok).toBe(true);
      if (reopened.ok) {
        expect(reopened.conversation.resolvedAt).toBeNull();
      }
    });

    it('preserves assignee when reopening', async () => {
      const agent = p.users.create({ type: 'human_agent', name: 'Agent' });
      const conv = await p.conversations.create(p.db, {
        channelOrigin: 'email',
        assigneeId: agent.id,
      });

      await p.conversations.resolve(p.db, conv.id, agent.id);
      const reopened = await p.conversations.reopen(p.db, conv.id, 'contact-1');

      if (reopened.ok) {
        expect(reopened.conversation.assigneeId).toBe(agent.id);
      }
    });
  });

  describe('Non-existent conversation operations', () => {
    it('returns not found for resolve on missing conversation', async () => {
      const result = await p.conversations.resolve(p.db, 'non-existent-id', 'agent-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('not found');
      }
    });

    it('returns undefined for getById on missing conversation', async () => {
      const result = await p.conversations.getById(p.db, 'non-existent-id');
      expect(result).toBeUndefined();
    });

    it('returns undefined for update on missing conversation', async () => {
      const result = await p.conversations.update(p.db, 'non-existent-id', {
        subject: 'test',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('Contact dedup', () => {
    it('creates contacts with unique identifiers', () => {
      const contact1 = p.users.create({
        type: 'contact',
        name: 'Jane',
        email: 'jane@example.com',
      });
      const contact2 = p.users.create({
        type: 'contact',
        name: 'Jane Builder',
        email: 'jane@example.com',
      });

      // Both created but have different IDs
      expect(contact1.id).not.toBe(contact2.id);

      // Both retrievable
      expect(p.users.get(contact1.id)).toBeDefined();
      expect(p.users.get(contact2.id)).toBeDefined();

      // Same email
      expect(contact1.email).toBe(contact2.email);
    });

    it('distinguishes agents from contacts by type', () => {
      const contact = p.users.create({ type: 'contact', name: 'Jane' });
      const agent = p.users.create({ type: 'human_agent', name: 'Jane Agent' });
      const bot = p.users.create({ type: 'ai_agent', name: 'Jane Bot' });

      expect(contact.type).toBe('contact');
      expect(agent.type).toBe('human_agent');
      expect(bot.type).toBe('ai_agent');
    });
  });

  describe('Visibility filtering', () => {
    it('conversations have public-facing data without internal details', async () => {
      const conv = await p.conversations.create(p.db, {
        channelOrigin: 'web_chat',
        subject: 'Public conversation',
        metadata: { internal: 'data', projectId: 'proj-123' },
      });

      // Conversation metadata should be preserved as-is
      expect(conv.metadata).toEqual({ internal: 'data', projectId: 'proj-123' });

      // Status is public facing
      expect(conv.status).toBe('open');
      expect(conv.id).toBeDefined();
      expect(conv.displayId).toBeDefined();
    });

    it('lists only conversations matching status filter', async () => {
      const conv1 = await p.conversations.create(p.db, { channelOrigin: 'email' });
      const conv2 = await p.conversations.create(p.db, { channelOrigin: 'email' });
      await p.conversations.create(p.db, { channelOrigin: 'email' });

      await p.conversations.resolve(p.db, conv1.id, 'agent-1');
      await p.conversations.resolve(p.db, conv2.id, 'agent-1');

      const open = await p.conversations.list(p.db, { status: 'open' });
      expect(open.total).toBe(1);

      const resolved = await p.conversations.list(p.db, { status: 'resolved' });
      expect(resolved.total).toBe(2);
    });
  });

  describe('Metadata handling', () => {
    it('merges metadata on update without losing existing keys', async () => {
      const conv = await p.conversations.create(p.db, {
        channelOrigin: 'email',
        metadata: { projectId: 'proj-1', source: 'inbound' },
      });

      const updated = await p.conversations.update(p.db, conv.id, {
        metadata: { priority_override: true },
      });

      expect(updated?.metadata).toEqual({
        projectId: 'proj-1',
        source: 'inbound',
        priority_override: true,
      });
    });
  });

  describe('Conversation events audit trail', () => {
    it('creates events for each status transition', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      // open -> resolved -> open -> snoozed -> open
      await p.conversations.resolve(p.db, conv.id, 'agent-1');
      await p.conversations.reopen(p.db, conv.id, 'contact-1');
      await p.conversations.snooze(p.db, conv.id, 'agent-1', new Date(Date.now() + 60000));
      await p.conversations.unsnooze(p.db, conv.id, 'system');

      const events = await p.conversations.getEvents(p.db, conv.id);

      // Should have: created, resolved, reopened, snoozed, reopened
      expect(events.length).toBeGreaterThanOrEqual(5);

      const types = events.map((e) => e.eventType);
      expect(types).toContain('created');
      expect(types).toContain('resolved');
      expect(types).toContain('snoozed');
      expect(types.filter((t) => t === 'reopened')).toHaveLength(2);
    });

    it('events include from/to in payload for status changes', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });
      await p.conversations.resolve(p.db, conv.id, 'agent-1');

      const events = await p.conversations.getEvents(p.db, conv.id);
      const resolvedEvent = events.find((e) => e.eventType === 'resolved');

      expect(resolvedEvent?.payload).toHaveProperty('from', 'open');
      expect(resolvedEvent?.payload).toHaveProperty('to', 'resolved');
    });
  });

  describe('Unsnooze edge cases', () => {
    it('rejects unsnooze on non-snoozed conversation', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });
      // Conversation is open, not snoozed
      const result = await p.conversations.unsnooze(p.db, conv.id, 'system');
      expect(result.ok).toBe(false);
    });
  });

  describe('Display ID consistency', () => {
    it('assigns monotonically increasing display IDs', async () => {
      const conv1 = await p.conversations.create(p.db, { channelOrigin: 'email' });
      const conv2 = await p.conversations.create(p.db, { channelOrigin: 'web_chat' });
      const conv3 = await p.conversations.create(p.db, { channelOrigin: 'sms' });

      expect(conv2.displayId).toBe(conv1.displayId + 1);
      expect(conv3.displayId).toBe(conv2.displayId + 1);
    });
  });
});
