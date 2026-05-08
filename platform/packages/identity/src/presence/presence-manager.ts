export interface PresenceState {
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
}

export type PresenceChangeHandler = (
  userId: string,
  state: PresenceState
) => void;

export interface PresenceManager {
  setOnline(userId: string): Promise<void>;
  setOffline(userId: string): Promise<void>;
  setStatus(
    userId: string,
    status: 'online' | 'away' | 'busy'
  ): Promise<void>;
  getPresence(userId: string): Promise<PresenceState>;
  getPresenceMulti(userIds: string[]): Promise<Map<string, PresenceState>>;
  getOnlineUsers(): Promise<string[]>;
  onPresenceChange(handler: PresenceChangeHandler): void;
}
