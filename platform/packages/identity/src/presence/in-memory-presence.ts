import type {
  PresenceChangeHandler,
  PresenceManager,
  PresenceState,
} from './presence-manager.js';

export class InMemoryPresenceManager implements PresenceManager {
  private state = new Map<string, PresenceState>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private handlers: PresenceChangeHandler[] = [];
  private ttlMs: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  async setOnline(userId: string): Promise<void> {
    this.clearTimer(userId);
    const presence: PresenceState = { status: 'online', lastSeen: new Date() };
    this.state.set(userId, presence);
    this.scheduleExpiry(userId);
    this.notify(userId, presence);
  }

  async setOffline(userId: string): Promise<void> {
    this.clearTimer(userId);
    const presence: PresenceState = {
      status: 'offline',
      lastSeen: new Date(),
    };
    this.state.delete(userId);
    this.notify(userId, presence);
  }

  async setStatus(
    userId: string,
    status: 'online' | 'away' | 'busy'
  ): Promise<void> {
    this.clearTimer(userId);
    const presence: PresenceState = { status, lastSeen: new Date() };
    this.state.set(userId, presence);
    this.scheduleExpiry(userId);
    this.notify(userId, presence);
  }

  async getPresence(userId: string): Promise<PresenceState> {
    return (
      this.state.get(userId) ?? { status: 'offline', lastSeen: new Date() }
    );
  }

  async getPresenceMulti(
    userIds: string[]
  ): Promise<Map<string, PresenceState>> {
    const result = new Map<string, PresenceState>();
    for (const id of userIds) {
      result.set(id, await this.getPresence(id));
    }
    return result;
  }

  async getOnlineUsers(): Promise<string[]> {
    return Array.from(this.state.keys());
  }

  onPresenceChange(handler: PresenceChangeHandler): void {
    this.handlers.push(handler);
  }

  /** Manually expire a user -- useful for testing TTL without real timers. */
  expireUser(userId: string): void {
    this.clearTimer(userId);
    const presence: PresenceState = {
      status: 'offline',
      lastSeen: new Date(),
    };
    this.state.delete(userId);
    this.notify(userId, presence);
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.state.clear();
    this.handlers = [];
  }

  private scheduleExpiry(userId: string): void {
    const timer = setTimeout(() => {
      this.state.delete(userId);
      this.notify(userId, { status: 'offline', lastSeen: new Date() });
      this.timers.delete(userId);
    }, this.ttlMs);
    this.timers.set(userId, timer);
  }

  private clearTimer(userId: string): void {
    const existing = this.timers.get(userId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(userId);
    }
  }

  private notify(userId: string, state: PresenceState): void {
    for (const handler of this.handlers) {
      handler(userId, state);
    }
  }
}
