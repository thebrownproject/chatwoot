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
export type PresenceKind = 'user' | 'contact';

const presenceKey = (kind: PresenceKind, id: number | string | bigint): string =>
  `presence:${kind}:${id}`;

export const markOnline = async (
  redis: Redis,
  kind: PresenceKind,
  id: number | string | bigint,
  availability: Availability = 'online',
): Promise<void> => {
  await redis.set(presenceKey(kind, id), availability, 'EX', PRESENCE_TTL_SECONDS);
};

export const markOffline = async (
  redis: Redis,
  kind: PresenceKind,
  id: number | string | bigint,
): Promise<void> => {
  await redis.del(presenceKey(kind, id));
};

export const extendHeartbeat = async (
  redis: Redis,
  kind: PresenceKind,
  id: number | string | bigint,
): Promise<void> => {
  await redis.expire(presenceKey(kind, id), PRESENCE_TTL_SECONDS);
};

export interface PresenceSnapshot {
  online: boolean;
  availability?: Availability;
}

export const getPresence = async (
  redis: Redis,
  kind: PresenceKind,
  id: number | string | bigint,
): Promise<PresenceSnapshot> => {
  const raw = await redis.get(presenceKey(kind, id));
  if (!raw) return { online: false };
  if (raw === 'online' || raw === 'busy' || raw === 'offline') {
    return { online: raw !== 'offline', availability: raw };
  }
  return { online: true };
};
