import type { Redis } from '@upstash/redis';
import type {
  PresenceChangeHandler,
  PresenceManager,
  PresenceState,
} from './presence-manager.js';

export interface RedisConfig {
  url: string;
  token: string;
}

const PRESENCE_KEY_PREFIX = 'presence:';
const ONLINE_SET_KEY = 'presence:online';
const DEFAULT_TTL_SECONDS = 5 * 60;

export class RedisPresenceManager implements PresenceManager {
  private redis: Redis;
  private ttlSeconds: number;
  private handlers: PresenceChangeHandler[] = [];

  constructor(redis: Redis, ttlSeconds = DEFAULT_TTL_SECONDS) {
    this.redis = redis;
    this.ttlSeconds = ttlSeconds;
  }

  async setOnline(userId: string): Promise<void> {
    const now = new Date();
    const data = JSON.stringify({ status: 'online', lastSeen: now.toISOString() });

    await Promise.all([
      this.redis.set(this.key(userId), data, { ex: this.ttlSeconds }),
      this.redis.sadd(ONLINE_SET_KEY, userId),
    ]);

    this.notify(userId, { status: 'online', lastSeen: now });
  }

  async setOffline(userId: string): Promise<void> {
    const now = new Date();

    await Promise.all([
      this.redis.del(this.key(userId)),
      this.redis.srem(ONLINE_SET_KEY, userId),
    ]);

    this.notify(userId, { status: 'offline', lastSeen: now });
  }

  async setStatus(
    userId: string,
    status: 'online' | 'away' | 'busy'
  ): Promise<void> {
    const now = new Date();
    const data = JSON.stringify({ status, lastSeen: now.toISOString() });

    await Promise.all([
      this.redis.set(this.key(userId), data, { ex: this.ttlSeconds }),
      this.redis.sadd(ONLINE_SET_KEY, userId),
    ]);

    this.notify(userId, { status, lastSeen: now });
  }

  async getPresence(userId: string): Promise<PresenceState> {
    const raw = await this.redis.get<string>(this.key(userId));
    if (!raw) {
      return { status: 'offline', lastSeen: new Date() };
    }
    const parsed = JSON.parse(raw) as { status: string; lastSeen: string };
    return {
      status: parsed.status as PresenceState['status'],
      lastSeen: new Date(parsed.lastSeen),
    };
  }

  async getPresenceMulti(
    userIds: string[]
  ): Promise<Map<string, PresenceState>> {
    if (userIds.length === 0) return new Map();

    const pipeline = this.redis.pipeline();
    for (const id of userIds) {
      pipeline.get(this.key(id));
    }
    const results = await pipeline.exec<(string | null)[]>();

    const map = new Map<string, PresenceState>();
    for (let i = 0; i < userIds.length; i++) {
      const raw = results[i];
      if (raw) {
        const parsed = JSON.parse(raw) as { status: string; lastSeen: string };
        map.set(userIds[i], {
          status: parsed.status as PresenceState['status'],
          lastSeen: new Date(parsed.lastSeen),
        });
      } else {
        map.set(userIds[i], { status: 'offline', lastSeen: new Date() });
      }
    }
    return map;
  }

  async getOnlineUsers(): Promise<string[]> {
    const members = await this.redis.smembers(ONLINE_SET_KEY);
    return members;
  }

  onPresenceChange(handler: PresenceChangeHandler): void {
    this.handlers.push(handler);
  }

  private key(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}${userId}`;
  }

  private notify(userId: string, state: PresenceState): void {
    for (const handler of this.handlers) {
      handler(userId, state);
    }
  }
}
