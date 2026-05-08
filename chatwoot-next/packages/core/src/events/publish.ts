import type Redis from 'ioredis';

/**
 * DomainEvent — fact emitted from the domain (e.g. `conversation.created`,
 * `message.sent`).
 *
 * Wire format published to Redis:
 *   { room: string, event: string, payload: unknown, ts: number }
 *
 * `room` is the canonical socket.io room name (see `accountRoom`/`userRoom`/
 * `conversationRoom`/`inboxRoom`). `apps/realtime` consumes from
 * `chatwoot:events`, decodes the envelope, and emits `event` with `payload`
 * to the requested room.
 */
export type DomainEvent = {
  room: string;
  event: string;
  payload: unknown;
  ts?: number;
};

/**
 * Redis pub/sub channel that fans events out to the realtime cluster.
 *
 * MUST stay in sync with `apps/realtime/src/redis.ts`'s
 * `REALTIME_REDIS_CHANNEL` and any Rails-side bridge during cutover.
 */
export const REALTIME_REDIS_CHANNEL = 'chatwoot:events';

/**
 * Publish a domain event onto the central Redis pub/sub channel.
 *
 * Returns the number of Redis subscribers that received the message — useful
 * for assertions in tests and metrics in prod.
 */
export async function publishEvent(redis: Redis, event: DomainEvent): Promise<number> {
  const envelope = { ...event, ts: event.ts ?? Date.now() };
  return redis.publish(REALTIME_REDIS_CHANNEL, JSON.stringify(envelope));
}

/**
 * Canonical room helpers.
 *
 * Names mirror the Rails ActionCable streams (see `app/channels/room_channel.rb`
 * and `app/listeners/action_cable_listener.rb`) so Vue dashboards still
 * receive events during the Rails -> Next.js cutover.
 */
export const accountRoom = (id: number | string | bigint): string => `account_${id}`;
export const userRoom = (id: number | string | bigint): string => `user_${id}`;
export const conversationRoom = (id: number | string | bigint): string => `conversation_${id}`;
export const inboxRoom = (id: number | string | bigint): string => `inbox_${id}`;
