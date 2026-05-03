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
 */

import { createServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import pino from 'pino';

import { authMiddleware } from './auth.js';
import { healthHandler } from './health.js';
import { createRedisClients, subscribeAndDispatch } from './redis.js';

const logger = pino({ name: 'realtime' });

const parseOrigins = (): string[] | true => {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) return true;
  return raw.split(',').map(o => o.trim()).filter(Boolean);
};

export const start = async (): Promise<void> => {
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

  const { pub, sub, events } = createRedisClients();
  io.adapter(createAdapter(pub, sub));

  io.use(authMiddleware);

  io.on('connection', socket => {
    // TODO: auto-join account/user/conversation rooms based on socket.data.auth
    // TODO: wire presence heartbeat + typing forwarders
    logger.debug({ id: socket.id }, 'client connected');
    socket.on('disconnect', () => {
      logger.debug({ id: socket.id }, 'client disconnected');
    });
  });

  await subscribeAndDispatch(events, io);

  const port = Number(process.env.PORT ?? 3002);
  httpServer.listen(port, () => {
    logger.info({ port }, 'realtime service listening');
  });
};

start().catch(err => {
  logger.error({ err }, 'failed to boot realtime service');
  process.exit(1);
});
