/**
 * Realtime service entrypoint.
 *
 * Replaces Rails ActionCable. Standalone Node process, deployed somewhere
 * that supports long-lived WebSockets (Fly.io / Railway / k8s) — NOT Vercel.
 *
 * Responsibilities:
 *   1. Boot a plain `http.Server` so we can mount `/healthz` next to
 *      Socket.io's upgrade handler.
 *   2. Create a Socket.io server with permissive CORS for known dashboard
 *      origins.
 *   3. Attach the Redis adapter so multiple realtime nodes share state.
 *   4. Subscribe to the `chatwoot:events` Redis channel and fan envelopes
 *      out to socket.io rooms (account/user/conversation/inbox).
 *   5. Validate every connection through the pubsubToken middleware.
 *   6. Auto-join account/user/conversation/inbox rooms based on auth+query.
 *   7. Forward `presence:heartbeat` events to keep Redis TTL fresh.
 */

import { createServer, type Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import pino from 'pino';

import { authMiddleware, type AuthedSocket } from './auth.js';
import { healthHandler } from './health.js';
import {
  extendHeartbeat,
  markOffline,
  markOnline,
  type PresenceKind,
} from './presence.js';
import {
  createRedisClients,
  subscribeAndDispatch,
  type RedisClients,
} from './redis.js';
import {
  accountRoom,
  conversationRoom,
  inboxRoom,
  userRoom,
} from './rooms.js';

const logger = pino({ name: 'realtime' });

const parseOrigins = (): string[] | true => {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) return true;
  return raw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
};

const optionalIdFromHandshake = (
  socket: AuthedSocket,
  key: string,
): string | null => {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const fromAuth = auth?.[key];
  if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;
  if (typeof fromAuth === 'number') return String(fromAuth);
  const fromQuery = socket.handshake.query?.[key];
  if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery;
  return null;
};

interface StartedServer {
  httpServer: HttpServer;
  io: IOServer;
  redis: RedisClients;
}

export const start = async (): Promise<StartedServer> => {
  const httpServer = createServer((req, res) => {
    if (healthHandler(req, res)) return;
    res.statusCode = 404;
    res.end();
  });

  const io = new IOServer(httpServer, {
    cors: {
      origin: parseOrigins(),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  const redis = createRedisClients();
  io.adapter(createAdapter(redis.pub, redis.sub));

  io.use(authMiddleware as unknown as Parameters<typeof io.use>[0]);

  io.on('connection', socket => {
    const authed = socket as unknown as AuthedSocket;
    const ctx = authed.data.auth;
    if (!ctx) {
      authed.disconnect(true);
      return;
    }

    const kind: PresenceKind = ctx.kind;
    const presenceId = ctx.id;

    void socket.join(accountRoom(String(ctx.accountId)));
    void socket.join(userRoom(String(ctx.id)));

    const conversationId = optionalIdFromHandshake(authed, 'conversationId');
    if (conversationId) void socket.join(conversationRoom(conversationId));

    const inboxId = optionalIdFromHandshake(authed, 'inboxId');
    if (inboxId) void socket.join(inboxRoom(inboxId));

    void markOnline(redis.pub, kind, presenceId).catch(err => {
      logger.warn({ err }, 'failed to mark presence online');
    });

    socket.on('presence:heartbeat', () => {
      void extendHeartbeat(redis.pub, kind, presenceId).catch(err => {
        logger.warn({ err }, 'failed to extend presence heartbeat');
      });
    });

    socket.on('disconnect', () => {
      logger.debug({ id: socket.id }, 'client disconnected');
      void markOffline(redis.pub, kind, presenceId).catch(err => {
        logger.warn({ err }, 'failed to mark presence offline');
      });
    });

    logger.debug({ id: socket.id, kind, userId: String(ctx.id) }, 'client connected');
  });

  await subscribeAndDispatch(redis.events, io);

  const port = Number(process.env.PORT ?? 3002);
  await new Promise<void>(resolve => {
    httpServer.listen(port, () => {
      logger.info({ port }, 'realtime service listening');
      resolve();
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down realtime service');
    try {
      await new Promise<void>(resolve => {
        io.close(() => resolve());
      });
    } catch (err) {
      logger.warn({ err }, 'error closing socket.io server');
    }
    await Promise.allSettled([
      redis.events.unsubscribe().catch(() => undefined),
      redis.pub.quit(),
      redis.sub.quit(),
      redis.events.quit(),
    ]);
    process.exit(0);
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  return { httpServer, io, redis };
};

const isMain = (() => {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const entry = process.argv[1];
  return entry.endsWith('server.js') || entry.endsWith('server.ts');
})();

if (isMain) {
  start().catch(err => {
    logger.error({ err }, 'failed to boot realtime service');
    process.exit(1);
  });
}
