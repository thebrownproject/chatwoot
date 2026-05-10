import { describe, it, expect, beforeEach } from 'vitest';
import { registerAdapter, getAdapter, listAdapters, clearAdapters } from '../registry.js';
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

function createMockAdapter(type: 'web_chat' | 'email' | 'sms' | 'slack' | 'in_app'): ChannelAdapter {
  return {
    type,
    receive: () => mockNormalized,
    deliver: async () => ({ success: true }),
    formatMessage: () => mockFormatted,
  };
}

describe('channel registry', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('registers and retrieves an adapter', () => {
    registerAdapter(createMockAdapter('web_chat'));
    const adapter = getAdapter('web_chat');
    expect(adapter.type).toBe('web_chat');
  });

  it('throws for unregistered channel type', () => {
    expect(() => getAdapter('sms')).toThrow('No channel adapter registered for type: sms');
  });

  it('lists registered adapter types', () => {
    registerAdapter(createMockAdapter('web_chat'));
    registerAdapter(createMockAdapter('email'));
    const types = listAdapters();
    expect(types).toContain('web_chat');
    expect(types).toContain('email');
    expect(types).toHaveLength(2);
  });

  it('throws on duplicate registration', () => {
    registerAdapter(createMockAdapter('web_chat'));
    expect(() => registerAdapter(createMockAdapter('web_chat'))).toThrow(
      'Channel adapter already registered for type: web_chat',
    );
  });

  it('clearAdapters removes all adapters', () => {
    registerAdapter(createMockAdapter('web_chat'));
    registerAdapter(createMockAdapter('email'));
    expect(listAdapters()).toHaveLength(2);
    clearAdapters();
    expect(listAdapters()).toHaveLength(0);
  });

  it('lists empty array when no adapters registered', () => {
    expect(listAdapters()).toEqual([]);
  });
});
