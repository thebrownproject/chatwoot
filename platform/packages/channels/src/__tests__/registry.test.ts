import { describe, it, expect, beforeEach } from 'vitest';
import { registerAdapter, getAdapter, listAdapters } from '../registry.js';
import type { ChannelAdapter } from '../types.js';

const mockAdapter: ChannelAdapter = {
  type: 'web_chat',
  receive: async () => ({ id: '1', conversationId: 'c-1', senderId: 's-1', body: 'hi', timestamp: new Date() }),
  deliver: async () => ({ success: true }),
  formatMessage: (msg) => ({ body: msg.body ?? '', senderName: 'Test', timestamp: new Date().toISOString() }),
};

describe('channel registry', () => {
  it('registers and retrieves an adapter', () => {
    registerAdapter(mockAdapter);
    const adapter = getAdapter('web_chat');
    expect(adapter.type).toBe('web_chat');
  });

  it('throws for unregistered channel type', () => {
    expect(() => getAdapter('sms' as any)).toThrow('No channel adapter registered for type: sms');
  });

  it('lists registered adapter types', () => {
    registerAdapter(mockAdapter);
    const types = listAdapters();
    expect(types).toContain('web_chat');
  });
});
