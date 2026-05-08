import { describe, it, expect } from 'vitest';
import { registerAdapter, getAdapter, listAdapters } from '../registry.js';
import type { ChannelAdapter, NormalizedMessage, FormattedMessage } from '../types.js';

const mockNormalized: NormalizedMessage = {
  conversationId: 'c-1',
  senderId: 's-1',
  senderType: 'contact',
  type: 'text',
  visibility: 'public',
  body: 'hi',
  timestamp: new Date(),
};

const mockFormatted: FormattedMessage = {
  id: 'm-1',
  conversationId: 'c-1',
  sender: { id: 's-1', name: 'Test', type: 'contact' },
  body: 'hi',
  timestamp: new Date().toISOString(),
  type: 'text',
};

const mockAdapter: ChannelAdapter = {
  type: 'web_chat',
  receive: () => mockNormalized,
  deliver: async () => ({ success: true }),
  formatMessage: () => mockFormatted,
};

describe('channel registry', () => {
  it('registers and retrieves an adapter', () => {
    registerAdapter(mockAdapter);
    const adapter = getAdapter('web_chat');
    expect(adapter.type).toBe('web_chat');
  });

  it('throws for unregistered channel type', () => {
    expect(() => getAdapter('sms')).toThrow('No channel adapter registered for type: sms');
  });

  it('lists registered adapter types', () => {
    registerAdapter(mockAdapter);
    const types = listAdapters();
    expect(types).toContain('web_chat');
  });
});
