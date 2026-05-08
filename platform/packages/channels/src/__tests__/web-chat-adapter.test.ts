import { describe, it, expect } from 'vitest';
import { webChatAdapter } from '../adapters/web-chat.js';
import type { ChannelConfig, NormalizedMessage } from '../types.js';

describe('WebChatAdapter', () => {
  describe('receive', () => {
    it('parses a valid raw message into NormalizedMessage', () => {
      const raw = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        body: 'Hello there',
        timestamp: '2026-01-01T00:00:00.000Z',
      };

      const result = webChatAdapter.receive(raw);

      expect(result.conversationId).toBe('conv-1');
      expect(result.senderId).toBe('user-1');
      expect(result.body).toBe('Hello there');
      expect(result.type).toBe('text');
      expect(result.visibility).toBe('public');
      expect(result.senderType).toBe('contact');
      expect(result.timestamp).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('defaults senderType to contact when not specified', () => {
      const raw = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        body: 'test',
      };

      const result = webChatAdapter.receive(raw);
      expect(result.senderType).toBe('contact');
    });

    it('preserves senderType when specified', () => {
      const raw = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        body: 'test',
        senderType: 'human_agent' as const,
      };

      const result = webChatAdapter.receive(raw);
      expect(result.senderType).toBe('human_agent');
    });

    it('includes optional fields when present', () => {
      const raw = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        body: 'test',
        bodyHtml: '<p>test</p>',
        metadata: { source: 'widget' },
        attachments: [
          { url: 'https://example.com/file.pdf', filename: 'file.pdf', contentType: 'application/pdf', size: 1024 },
        ],
      };

      const result = webChatAdapter.receive(raw);
      expect(result.bodyHtml).toBe('<p>test</p>');
      expect(result.metadata).toEqual({ source: 'widget' });
      expect(result.attachments).toHaveLength(1);
    });

    it('throws on invalid input', () => {
      expect(() => webChatAdapter.receive(null)).toThrow('Invalid web chat message');
      expect(() => webChatAdapter.receive({})).toThrow('Invalid web chat message');
      expect(() => webChatAdapter.receive({ conversationId: 'x' })).toThrow('Invalid web chat message');
    });

    it('uses current date when timestamp is not provided', () => {
      const before = new Date();
      const raw = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        body: 'test',
      };

      const result = webChatAdapter.receive(raw);
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('deliver', () => {
    it('returns success with an external ID', async () => {
      const message: NormalizedMessage = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderType: 'contact',
        type: 'text',
        visibility: 'public',
        body: 'Hello',
        timestamp: new Date(),
      };
      const channelConfig: ChannelConfig = {
        id: 'ch-1',
        type: 'web_chat',
        name: 'Website Chat',
        config: {},
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await webChatAdapter.deliver(message, channelConfig);

      expect(result.success).toBe(true);
      expect(result.externalId).toMatch(/^wc_conv-1_/);
    });
  });

  describe('formatMessage', () => {
    it('formats a message for widget display', () => {
      const message: NormalizedMessage = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderType: 'contact',
        type: 'text',
        visibility: 'public',
        body: 'Hello',
        bodyHtml: '<p>Hello</p>',
        timestamp: new Date('2026-01-01T12:00:00.000Z'),
      };
      const sender = {
        id: 'user-1',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.png',
      };

      const result = webChatAdapter.formatMessage(message, sender);

      expect(result.conversationId).toBe('conv-1');
      expect(result.sender.id).toBe('user-1');
      expect(result.sender.name).toBe('John Doe');
      expect(result.sender.type).toBe('contact');
      expect(result.body).toBe('Hello');
      expect(result.bodyHtml).toBe('<p>Hello</p>');
      expect(result.timestamp).toBe('2026-01-01T12:00:00.000Z');
    });

    it('maps agent sender types correctly', () => {
      const message: NormalizedMessage = {
        conversationId: 'conv-1',
        senderId: 'agent-1',
        senderType: 'human_agent',
        type: 'text',
        visibility: 'public',
        body: 'Hi',
        timestamp: new Date(),
      };

      const result = webChatAdapter.formatMessage(message, { id: 'agent-1', name: 'Agent' });
      expect(result.sender.type).toBe('agent');
    });

    it('maps ai_agent to agent display type', () => {
      const message: NormalizedMessage = {
        conversationId: 'conv-1',
        senderId: 'bot-1',
        senderType: 'ai_agent',
        type: 'text',
        visibility: 'public',
        body: 'Bot response',
        timestamp: new Date(),
      };

      const result = webChatAdapter.formatMessage(message, { id: 'bot-1', name: 'Ron' });
      expect(result.sender.type).toBe('agent');
    });

    it('maps system sender type', () => {
      const message: NormalizedMessage = {
        conversationId: 'conv-1',
        senderId: 'system',
        senderType: 'system',
        type: 'activity',
        visibility: 'public',
        body: 'Conversation assigned',
        timestamp: new Date(),
      };

      const result = webChatAdapter.formatMessage(message, { id: 'system', name: 'System' });
      expect(result.sender.type).toBe('system');
    });
  });
});
