import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const redisOptions = { maxRetriesPerRequest: null } as const;

/**
 * BullMQ requires two distinct ioredis connections per app instance:
 *
 *   1. A "regular" connection used by `Queue` to enqueue jobs and inspect
 *      state. This connection is shared across all queues in this process.
 *   2. A "blocking" connection used by `Worker`. BullMQ Workers issue
 *      blocking BRPOPLPUSH commands which monopolise the underlying socket,
 *      so each Worker MUST own its own connection — sharing with `Queue`
 *      would deadlock the queue side.
 *
 * Both connections require `maxRetriesPerRequest: null` (BullMQ docs); any
 * finite retry count makes the blocking command fail under load.
 */
export function createWorkerRedis(): Redis {
  return new Redis(redisUrl, redisOptions);
}

export function createBlockingRedis(): Redis {
  return new Redis(redisUrl, redisOptions);
}

// Shared connection used by `Queue` instances and the bootstrap shutdown
// path. Workers create their own via `createBlockingRedis`.
export const connection = createWorkerRedis();
