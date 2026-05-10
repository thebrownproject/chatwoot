import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { WebSocket } from 'ws';
import { createWsServer } from '../realtime/ws-server.js';

/** Helper: start server on random port, return cleanup fn */
function startServer(opts: {
  onAuthorize?: (userId: string, conversationId: string) => Promise<boolean>;
}) {
  const httpServer = createServer();
  const { connections } = createWsServer({
    server: httpServer,
    authenticate: async () => ({ userId: 'user-1', userName: 'Alice' }),
    onAuthorize: opts.onAuthorize,
  });

  return new Promise<{
    url: string;
    connections: typeof connections;
    close: () => Promise<void>;
  }>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        url: `ws://127.0.0.1:${port}/ws`,
        connections,
        close: () =>
          new Promise<void>((res) => {
            httpServer.close(() => res());
          }),
      });
    });
  });
}

/** Connect a WS client and wait for the presence event (server sends on connect) */
function connect(url: string): Promise<{ ws: WebSocket; received: string[] }> {
  return new Promise((resolve, reject) => {
    const received: string[] = [];
    const ws = new WebSocket(url);
    ws.on('message', (data) => received.push(String(data)));
    ws.on('open', () => {
      // Wait briefly for the presence broadcast to arrive
      setTimeout(() => resolve({ ws, received }), 50);
    });
    ws.on('error', reject);
  });
}

/** Send a subscribe event and wait for the server to process it */
function subscribeAndWait(
  ws: WebSocket,
  conversationId: string,
  ms = 100,
): Promise<void> {
  return new Promise((resolve) => {
    ws.send(JSON.stringify({ type: 'subscribe', conversationId }));
    setTimeout(resolve, ms);
  });
}

describe('ws-server subscribe authorization', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it('rejects subscription when onAuthorize returns false', async () => {
    const server = await startServer({
      onAuthorize: async () => false,
    });
    cleanup = server.close;

    const { ws, received } = await connect(server.url);

    // Clear initial presence event
    received.length = 0;

    await subscribeAndWait(ws, 'conv-secret');

    ws.close();

    // Should have received an error, not been subscribed
    expect(server.connections.getConversationSubscriberCount('conv-secret')).toBe(0);

    const errorMsg = received.find((r) => {
      const parsed = JSON.parse(r);
      return parsed.type === 'error';
    });
    expect(errorMsg).toBeDefined();
    expect(JSON.parse(errorMsg!).message).toContain('Not authorized');
  });

  it('allows subscription when onAuthorize returns true', async () => {
    const server = await startServer({
      onAuthorize: async () => true,
    });
    cleanup = server.close;

    const { ws, received } = await connect(server.url);

    received.length = 0;

    await subscribeAndWait(ws, 'conv-allowed');

    // Should be subscribed, no error
    expect(server.connections.getConversationSubscriberCount('conv-allowed')).toBe(1);

    const errorMsg = received.find((r) => {
      const parsed = JSON.parse(r);
      return parsed.type === 'error';
    });
    expect(errorMsg).toBeUndefined();

    ws.close();
  });

  it('allows subscription when no onAuthorize callback is configured', async () => {
    const server = await startServer({});
    cleanup = server.close;

    const { ws, received } = await connect(server.url);

    received.length = 0;

    await subscribeAndWait(ws, 'conv-open');

    // Should be subscribed, no error
    expect(server.connections.getConversationSubscriberCount('conv-open')).toBe(1);

    const errorMsg = received.find((r) => {
      const parsed = JSON.parse(r);
      return parsed.type === 'error';
    });
    expect(errorMsg).toBeUndefined();

    ws.close();
  });
});
