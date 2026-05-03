/**
 * Presence tracking — Redis-backed mirror of Rails' `OnlineStatusTracker`.
 *
 * Each connected user/contact owns a key `presence:user:<id>` (or
 * `presence:contact:<id>`) with a 60s TTL. Clients send a heartbeat every
 * 20s; that re-extends the TTL via `EXPIRE`. When the TTL lapses the user
 * is considered offline.
 *
 * The stored value mirrors the `users.availability` enum (`online`, `busy`,
 * `offline`) so dashboards rendering the avatar dot can read the same
 * signal Rails wrote.
 */

import type { Redis } from 'ioredis';

export const PRESENCE_TTL_SECONDS = 60;
export const PRESENCE_HEARTBEAT_SECONDS = 20;

export type Availability = 'online' | 'busy' | 'offline';

const presenceKey = (kind: 'user' | 'contact', id: number | string): string =>
  `presence:${kind}:${id}`;

export const trackPresence = async (
  redis: Redis,
  kind: 'user' | 'contact',
  id: number | string,
  availability: Availability = 'online'
): Promise<void> => {
  // TODO: also publish a `presence.update` event on the account room so
  // dashboards refresh availability dots in real time.
  await redis.set(presenceKey(kind, id), availability, 'EX', PRESENCE_TTL_SECONDS);
};

export const heartbeat = async (
  redis: Redis,
  kind: 'user' | 'contact',
  id: number | string
): Promise<void> => {
  await redis.expire(presenceKey(kind, id), PRESENCE_TTL_SECONDS);
};

export const clearPresence = async (
  redis: Redis,
  kind: 'user' | 'contact',
  id: number | string
): Promise<void> => {
  await redis.del(presenceKey(kind, id));
};
