export type {
  PresenceManager,
  PresenceState,
  PresenceChangeHandler,
} from './presence-manager.js';
export { InMemoryPresenceManager } from './in-memory-presence.js';
export { RedisPresenceManager } from './redis-presence.js';
export type { RedisConfig } from './redis-presence.js';

import type { Redis } from '@upstash/redis';
import { InMemoryPresenceManager } from './in-memory-presence.js';
import { RedisPresenceManager } from './redis-presence.js';
import type { PresenceManager } from './presence-manager.js';

export function createPresenceManager(config?: {
  redis?: Redis;
  ttlSeconds?: number;
}): PresenceManager {
  if (config?.redis) {
    return new RedisPresenceManager(config.redis, config.ttlSeconds);
  }
  const ttlMs = config?.ttlSeconds ? config.ttlSeconds * 1000 : undefined;
  return new InMemoryPresenceManager(ttlMs);
}
