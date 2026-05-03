/**
 * Redis clients used by the realtime service.
 *
 * - `pub` / `sub` are passed to `@socket.io/redis-adapter` so socket.io can
 *   broadcast across multiple realtime nodes.
 * - `events` is a dedicated subscriber listening to the `chatwoot:events`
 *   channel. Both the legacy Rails app (`apps/core/events/publish` /
 *   `Redis.current.publish`) and the Next.js core package publish events
 *   there during cutover.
 *
 * Wire format published to `chatwoot:events`:
 *   { room: string, event: string, payload: unknown }
 *
 * The subscriber unpacks the envelope and emits `event` with `payload` into
 * the requested socket.io `room`.
 */

import { Redis } from 'ioredis';
import type { Server as IOServer } from 'socket.io';

export const REALTIME_REDIS_CHANNEL = 'chatwoot:events';

export interface RedisEnvelope {
  room: string;
  event: string;
  payload: unknown;
}

export const createRedisClient = (): Redis => {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379/0';
  return new Redis(url, { lazyConnect: false, maxRetriesPerRequest: null });
};

export interface RedisClients {
  pub: Redis;
  sub: Redis;
  events: Redis;
}

export const createRedisClients = (): RedisClients => ({
  pub: createRedisClient(),
  sub: createRedisClient(),
  events: createRedisClient(),
});

export const subscribeAndDispatch = async (
  events: Redis,
  io: IOServer
): Promise<void> => {
  await events.subscribe(REALTIME_REDIS_CHANNEL);
  events.on('message', (_channel, message) => {
    // TODO: structured logging + payload validation (zod) + metrics.
    try {
      const envelope = JSON.parse(message) as RedisEnvelope;
      if (!envelope?.room || !envelope?.event) return;
      io.to(envelope.room).emit(envelope.event, envelope.payload);
    } catch {
      // swallow malformed envelopes; logger will handle once wired.
    }
  });
};
