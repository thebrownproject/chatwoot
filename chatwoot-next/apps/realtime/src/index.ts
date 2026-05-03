/**
 * Public surface for tests and any in-process consumers (e.g. integration
 * tests that boot the server in-band).
 */

export { start } from './server.js';
export {
  authMiddleware,
  lookupPubsubToken,
  _clearAuthCacheForTests,
  _setAuthDepsForTests,
} from './auth.js';
export type { AuthedSocket, SocketAuthContext, AuthDeps } from './auth.js';
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
  markOnline,
  markOffline,
  extendHeartbeat,
  getPresence,
} from './presence.js';
export type { Availability, PresenceKind, PresenceSnapshot } from './presence.js';
export { healthHandler } from './health.js';
