import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import { ConnectionManager } from './connection-manager.js';
import { wsClientEventSchema, type WsServerEvent } from '../types.js';

export interface WsServerOptions {
  server: Server;
  /** Authenticate a connection. Return userId + userName or null to reject. */
  authenticate: (
    token: string | null,
  ) => Promise<{ userId: string; userName: string } | null>;
  /** Handle an inbound message from a client */
  onMessage?: (
    userId: string,
    conversationId: string,
    body: string,
  ) => Promise<void>;
}

/**
 * WebSocket server for realtime messaging.
 *
 * Auth: clients pass a token via query param `?token=...` or as the first
 * protocol. Clerk JWT for authenticated agents, or a widget session token
 * for anonymous contacts.
 *
 * Responsibilities:
 * - Auth on connect
 * - Message routing (client -> conversation subscribers)
 * - Typing indicators
 * - Subscription management
 */
export function createWsServer(options: WsServerOptions): {
  wss: WebSocketServer;
  connections: ConnectionManager;
} {
  const connections = new ConnectionManager();

  const wss = new WebSocketServer({
    server: options.server,
    path: '/ws',
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const token = url.searchParams.get('token');

    const authResult = await options.authenticate(token);

    if (!authResult) {
      const errorEvent: WsServerEvent = {
        type: 'error',
        message: 'Authentication failed',
      };
      ws.send(JSON.stringify(errorEvent));
      ws.close(4001, 'Unauthorized');
      return;
    }

    connections.add(ws, {
      ws,
      userId: authResult.userId,
      userName: authResult.userName,
      isAuthenticated: true,
    });

    connections.broadcastAll(
      {
        type: 'presence',
        userId: authResult.userId,
        status: 'online',
      },
      ws,
    );

    ws.on('message', (data) => {
      handleClientMessage(ws, data, connections, options);
    });

    ws.on('close', () => {
      const info = connections.remove(ws);
      if (info && !connections.isUserOnline(info.userId)) {
        connections.broadcastAll({
          type: 'presence',
          userId: info.userId,
          status: 'offline',
        });
      }
    });
  });

  return { wss, connections };
}

function handleClientMessage(
  ws: WebSocket,
  data: unknown,
  connections: ConnectionManager,
  options: WsServerOptions,
): void {
  const info = connections.getConnection(ws);
  if (!info) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(data));
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' } satisfies WsServerEvent));
    return;
  }

  const result = wsClientEventSchema.safeParse(parsed);
  if (!result.success) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: `Invalid event: ${result.error.issues[0]?.message ?? 'unknown'}`,
      } satisfies WsServerEvent),
    );
    return;
  }

  const event = result.data;

  switch (event.type) {
    case 'subscribe':
      connections.subscribe(ws, event.conversationId);
      break;

    case 'unsubscribe':
      connections.unsubscribe(ws, event.conversationId);
      break;

    case 'typing':
      connections.broadcastToConversation(
        event.conversationId,
        {
          type: 'typing',
          conversationId: event.conversationId,
          userId: info.userId,
          userName: info.userName,
          isTyping: event.isTyping,
        },
        ws,
      );
      break;

    case 'message':
      options.onMessage?.(info.userId, event.conversationId, event.body).catch(() => {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
          } satisfies WsServerEvent),
        );
      });
      break;
  }
}
