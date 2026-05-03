import type Redis from 'ioredis';

/**
 * DomainEvent — stub.
 *
 * Represents a fact emitted from the domain (e.g. `conversation.created`,
 * `message.sent`). Schemas per event will be filled in during Phase 3.
 */
export type DomainEvent = {
  room: string;
  event: string;
  payload: unknown;
};

const EVENT_CHANNEL = 'chatwoot:events';

/**
 * Publish a domain event onto the central Redis pub/sub channel.
 *
 * This is the central indirection point: during cutover Rails publishes onto
 * this same channel via `Redis::Alfred`, and `apps/realtime` subscribes and
 * fans the event out to Socket.io rooms. Once Rails is decommissioned the
 * Node services become the sole producers.
 */
export async function publishEvent(redis: Redis, event: DomainEvent): Promise<void> {
  await redis.publish(EVENT_CHANNEL, JSON.stringify(event));
}
