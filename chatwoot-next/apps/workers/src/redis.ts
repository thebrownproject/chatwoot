import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

// BullMQ requires `maxRetriesPerRequest: null` for the connection it uses for
// blocking commands (workers, queue events). We share one connection across
// queues/workers in this app for simplicity.
export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});
