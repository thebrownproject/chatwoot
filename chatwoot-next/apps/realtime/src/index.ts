/**
 * Public surface for tests and any in-process consumers (e.g. integration
 * tests that boot the server in-band).
 */

export { start } from './server.js';
export { authMiddleware } from './auth.js';
export {
  accountRoom,
  userRoom,
  conversationRoom,
  inboxRoom,
} from './rooms.js';
export {
  REALTIME_REDIS_CHANNEL,
  createRedisClient,
  createRedisClients,
  subscribeAndDispatch,
} from './redis.js';
export type { RedisClients, RedisEnvelope } from './redis.js';
export {
  PRESENCE_TTL_SECONDS,
  PRESENCE_HEARTBEAT_SECONDS,
  trackPresence,
  heartbeat,
  clearPresence,
} from './presence.js';
export type { Availability } from './presence.js';
export { healthHandler } from './health.js';
