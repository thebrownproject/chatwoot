/**
 * Redis clients used by the realtime service.
 *
 * - `pub` / `sub` are passed to `@socket.io/redis-adapter` so socket.io can
 *   broadcast across multiple realtime nodes.
 * - `events` is a dedicated subscriber listening to the `chatwoot:events`
 *   channel. Both the legacy Rails app (`Redis.current.publish`) and
 *   `@chatwoot-next/core`'s `publishEvent` write to that channel during the
 *   cutover.
 *
 * Wire format published to `chatwoot:events`:
 *   { room: string, event: string, payload: unknown, ts: number }
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
  ts?: number;
}

const isEnvelope = (value: unknown): value is RedisEnvelope => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.room === 'string' && typeof v.event === 'string';
};

export const createRedisClient = (url?: string): Redis => {
  const target = url ?? process.env.REDIS_URL ?? 'redis://localhost:6379/0';
  return new Redis(target, { lazyConnect: false, maxRetriesPerRequest: null });
};

export interface RedisClients {
  pub: Redis;
  sub: Redis;
  events: Redis;
}

/**
 * Creates the three Redis clients required by the realtime service.
 *
 * `pub` and `sub` belong to the socket.io Redis adapter; ioredis requires a
 * dedicated connection per role because subscribers cannot issue regular
 * commands. `events` is a third subscriber listening to `chatwoot:events`.
 */
export const createRedisClients = (url?: string): RedisClients => ({
  pub: createRedisClient(url),
  sub: createRedisClient(url),
  events: createRedisClient(url),
});

export const subscribeAndDispatch = async (
  events: Redis,
  io: IOServer,
): Promise<void> => {
  await events.subscribe(REALTIME_REDIS_CHANNEL);

  events.on('message', (channel, message) => {
    if (channel !== REALTIME_REDIS_CHANNEL) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      // TODO: swap console for pino once it's wired here.
      // eslint-disable-next-line no-console
      console.warn('[realtime] dropping malformed envelope (json)', { message });
      return;
    }

    if (!isEnvelope(parsed)) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] dropping malformed envelope (shape)', { parsed });
      return;
    }

    io.to(parsed.room).emit(parsed.event, parsed.payload);
  });
};
