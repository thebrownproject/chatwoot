import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionManager } from '../realtime/connection-manager.js';
import type { WsServerEvent } from '../types.js';

/** Minimal mock WebSocket for testing */
function createMockWs(): {
  ws: any;
  sent: string[];
} {
  const sent: string[] = [];
  const ws = {
    readyState: 1, // OPEN
    OPEN: 1,
    send: vi.fn((data: string) => sent.push(data)),
  };
  return { ws, sent };
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  describe('add/remove', () => {
    it('tracks connections', () => {
      const { ws } = createMockWs();
      manager.add(ws, {
        ws,
        userId: 'user-1',
        userName: 'Alice',
        isAuthenticated: true,
      });

      expect(manager.getConnectionCount()).toBe(1);
      expect(manager.isUserOnline('user-1')).toBe(true);
    });

    it('removes connections and cleans up', () => {
      const { ws } = createMockWs();
      manager.add(ws, {
        ws,
        userId: 'user-1',
        userName: 'Alice',
        isAuthenticated: true,
      });

      manager.remove(ws);

      expect(manager.getConnectionCount()).toBe(0);
      expect(manager.isUserOnline('user-1')).toBe(false);
    });

    it('handles multiple connections per user', () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2 } = createMockWs();

      manager.add(ws1, { ws: ws1, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.add(ws2, { ws: ws2, userId: 'user-1', userName: 'Alice', isAuthenticated: true });

      expect(manager.getConnectionCount()).toBe(2);
      expect(manager.isUserOnline('user-1')).toBe(true);

      manager.remove(ws1);
      expect(manager.isUserOnline('user-1')).toBe(true);

      manager.remove(ws2);
      expect(manager.isUserOnline('user-1')).toBe(false);
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('subscribes a connection to a conversation', () => {
      const { ws } = createMockWs();
      manager.add(ws, { ws, userId: 'user-1', userName: 'Alice', isAuthenticated: true });

      const result = manager.subscribe(ws, 'conv-1');

      expect(result).toBe(true);
      expect(manager.getConversationSubscriberCount('conv-1')).toBe(1);
    });

    it('unsubscribes a connection from a conversation', () => {
      const { ws } = createMockWs();
      manager.add(ws, { ws, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.subscribe(ws, 'conv-1');

      manager.unsubscribe(ws, 'conv-1');

      expect(manager.getConversationSubscriberCount('conv-1')).toBe(0);
    });

    it('returns false for unknown connections', () => {
      const { ws } = createMockWs();
      expect(manager.subscribe(ws, 'conv-1')).toBe(false);
    });

    it('cleans up conversation subscriptions on remove', () => {
      const { ws } = createMockWs();
      manager.add(ws, { ws, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.subscribe(ws, 'conv-1');
      manager.subscribe(ws, 'conv-2');

      manager.remove(ws);

      expect(manager.getConversationSubscriberCount('conv-1')).toBe(0);
      expect(manager.getConversationSubscriberCount('conv-2')).toBe(0);
    });
  });

  describe('broadcastToConversation', () => {
    it('sends to all subscribers of a conversation', () => {
      const { ws: ws1, sent: sent1 } = createMockWs();
      const { ws: ws2, sent: sent2 } = createMockWs();

      manager.add(ws1, { ws: ws1, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.add(ws2, { ws: ws2, userId: 'user-2', userName: 'Bob', isAuthenticated: true });
      manager.subscribe(ws1, 'conv-1');
      manager.subscribe(ws2, 'conv-1');

      const event: WsServerEvent = {
        type: 'typing',
        conversationId: 'conv-1',
        userId: 'user-3',
        userName: 'Charlie',
        isTyping: true,
      };
      manager.broadcastToConversation('conv-1', event);

      expect(sent1).toHaveLength(1);
      expect(sent2).toHaveLength(1);
      expect(JSON.parse(sent1[0]!)).toEqual(event);
    });

    it('excludes specified WebSocket from broadcast', () => {
      const { ws: ws1, sent: sent1 } = createMockWs();
      const { ws: ws2, sent: sent2 } = createMockWs();

      manager.add(ws1, { ws: ws1, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.add(ws2, { ws: ws2, userId: 'user-2', userName: 'Bob', isAuthenticated: true });
      manager.subscribe(ws1, 'conv-1');
      manager.subscribe(ws2, 'conv-1');

      const event: WsServerEvent = {
        type: 'typing',
        conversationId: 'conv-1',
        userId: 'user-1',
        userName: 'Alice',
        isTyping: true,
      };
      manager.broadcastToConversation('conv-1', event, ws1);

      expect(sent1).toHaveLength(0);
      expect(sent2).toHaveLength(1);
    });

    it('skips connections that are not OPEN', () => {
      const { ws, sent } = createMockWs();
      ws.readyState = 3; // CLOSED

      manager.add(ws, { ws, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.subscribe(ws, 'conv-1');

      manager.broadcastToConversation('conv-1', { type: 'error', message: 'test' });

      expect(sent).toHaveLength(0);
    });
  });

  describe('sendToUser', () => {
    it('sends to all connections of a specific user', () => {
      const { ws: ws1, sent: sent1 } = createMockWs();
      const { ws: ws2, sent: sent2 } = createMockWs();

      manager.add(ws1, { ws: ws1, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.add(ws2, { ws: ws2, userId: 'user-1', userName: 'Alice', isAuthenticated: true });

      const event: WsServerEvent = { type: 'presence', userId: 'user-2', status: 'online' };
      manager.sendToUser('user-1', event);

      expect(sent1).toHaveLength(1);
      expect(sent2).toHaveLength(1);
    });
  });

  describe('getOnlineUserIds', () => {
    it('returns all online user IDs', () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2 } = createMockWs();

      manager.add(ws1, { ws: ws1, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.add(ws2, { ws: ws2, userId: 'user-2', userName: 'Bob', isAuthenticated: true });

      const online = manager.getOnlineUserIds();
      expect(online).toContain('user-1');
      expect(online).toContain('user-2');
      expect(online).toHaveLength(2);
    });
  });

  describe('error resilience', () => {
    it('continues broadcasting when one connection throws on send', () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2, sent: sent2 } = createMockWs();

      ws1.send = vi.fn(() => {
        throw new Error('Connection reset');
      });

      manager.add(ws1, { ws: ws1, userId: 'user-1', userName: 'Alice', isAuthenticated: true });
      manager.add(ws2, { ws: ws2, userId: 'user-2', userName: 'Bob', isAuthenticated: true });
      manager.subscribe(ws1, 'conv-1');
      manager.subscribe(ws2, 'conv-1');

      const event: WsServerEvent = { type: 'error', message: 'test' };
      manager.broadcastToConversation('conv-1', event);

      expect(sent2).toHaveLength(1);
      expect(JSON.parse(sent2[0]!)).toEqual(event);
    });

    it('does not send to non-existent conversation subscribers', () => {
      const event: WsServerEvent = { type: 'error', message: 'test' };
      expect(() => manager.broadcastToConversation('nonexistent', event)).not.toThrow();
    });

    it('does not send to non-existent user', () => {
      const event: WsServerEvent = { type: 'error', message: 'test' };
      expect(() => manager.sendToUser('nonexistent', event)).not.toThrow();
    });
  });

  describe('remove edge cases', () => {
    it('returns undefined for unknown websocket', () => {
      const { ws } = createMockWs();
      expect(manager.remove(ws)).toBeUndefined();
    });

    it('handles duplicate subscribe gracefully', () => {
      const { ws } = createMockWs();
      manager.add(ws, { ws, userId: 'user-1', userName: 'Alice', isAuthenticated: true });

      manager.subscribe(ws, 'conv-1');
      manager.subscribe(ws, 'conv-1');

      expect(manager.getConversationSubscriberCount('conv-1')).toBe(1);
    });

    it('handles unsubscribe from non-subscribed conversation', () => {
      const { ws } = createMockWs();
      manager.add(ws, { ws, userId: 'user-1', userName: 'Alice', isAuthenticated: true });

      expect(manager.unsubscribe(ws, 'conv-1')).toBe(true);
      expect(manager.getConversationSubscriberCount('conv-1')).toBe(0);
    });
  });
});
