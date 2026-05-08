import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryPresenceManager } from '../in-memory-presence.js';
import { createPresenceManager } from '../index.js';

describe('InMemoryPresenceManager', () => {
  let pm: InMemoryPresenceManager;

  beforeEach(() => {
    pm = new InMemoryPresenceManager();
  });

  afterEach(() => {
    pm.dispose();
  });

  it('defaults to offline for unknown users', async () => {
    const state = await pm.getPresence('unknown-user');
    expect(state.status).toBe('offline');
  });

  it('sets a user online and verifies presence', async () => {
    await pm.setOnline('user-1');
    const state = await pm.getPresence('user-1');
    expect(state.status).toBe('online');
    expect(state.lastSeen).toBeInstanceOf(Date);
  });

  it('sets a user offline and verifies absence', async () => {
    await pm.setOnline('user-1');
    await pm.setOffline('user-1');
    const state = await pm.getPresence('user-1');
    expect(state.status).toBe('offline');
  });

  it('tracks online users list', async () => {
    await pm.setOnline('user-1');
    await pm.setOnline('user-2');
    const online = await pm.getOnlineUsers();
    expect(online).toContain('user-1');
    expect(online).toContain('user-2');
    expect(online).toHaveLength(2);
  });

  it('removes user from online list on setOffline', async () => {
    await pm.setOnline('user-1');
    await pm.setOnline('user-2');
    await pm.setOffline('user-1');
    const online = await pm.getOnlineUsers();
    expect(online).toEqual(['user-2']);
  });

  it('handles status transitions: online -> away -> busy -> offline', async () => {
    await pm.setOnline('user-1');
    expect((await pm.getPresence('user-1')).status).toBe('online');

    await pm.setStatus('user-1', 'away');
    expect((await pm.getPresence('user-1')).status).toBe('away');

    await pm.setStatus('user-1', 'busy');
    expect((await pm.getPresence('user-1')).status).toBe('busy');

    await pm.setOffline('user-1');
    expect((await pm.getPresence('user-1')).status).toBe('offline');
  });

  it('queries presence for multiple users', async () => {
    await pm.setOnline('user-1');
    await pm.setStatus('user-2', 'away');
    // user-3 never set -- should be offline

    const result = await pm.getPresenceMulti(['user-1', 'user-2', 'user-3']);
    expect(result.get('user-1')?.status).toBe('online');
    expect(result.get('user-2')?.status).toBe('away');
    expect(result.get('user-3')?.status).toBe('offline');
    expect(result.size).toBe(3);
  });

  it('simulates TTL expiry via expireUser', async () => {
    await pm.setOnline('user-1');
    expect((await pm.getPresence('user-1')).status).toBe('online');

    pm.expireUser('user-1');

    expect((await pm.getPresence('user-1')).status).toBe('offline');
    expect(await pm.getOnlineUsers()).toEqual([]);
  });

  it('fires presence change handlers', async () => {
    const changes: Array<{ userId: string; status: string }> = [];
    pm.onPresenceChange((userId, state) => {
      changes.push({ userId, status: state.status });
    });

    await pm.setOnline('user-1');
    await pm.setStatus('user-1', 'away');
    await pm.setOffline('user-1');

    expect(changes).toEqual([
      { userId: 'user-1', status: 'online' },
      { userId: 'user-1', status: 'away' },
      { userId: 'user-1', status: 'offline' },
    ]);
  });

  it('heartbeat (setOnline) refreshes TTL', async () => {
    vi.useFakeTimers();
    const shortTtl = new InMemoryPresenceManager(1000);

    await shortTtl.setOnline('user-1');
    expect((await shortTtl.getPresence('user-1')).status).toBe('online');

    // Advance 800ms, then heartbeat
    vi.advanceTimersByTime(800);
    await shortTtl.setOnline('user-1');

    // Advance another 800ms -- past original TTL but within refreshed TTL
    vi.advanceTimersByTime(800);
    expect((await shortTtl.getPresence('user-1')).status).toBe('online');

    // Advance past refreshed TTL
    vi.advanceTimersByTime(300);
    expect((await shortTtl.getPresence('user-1')).status).toBe('offline');

    shortTtl.dispose();
    vi.useRealTimers();
  });

  it('TTL auto-expires user after timeout', async () => {
    vi.useFakeTimers();
    const shortTtl = new InMemoryPresenceManager(500);

    await shortTtl.setOnline('user-1');
    expect((await shortTtl.getPresence('user-1')).status).toBe('online');

    vi.advanceTimersByTime(600);
    expect((await shortTtl.getPresence('user-1')).status).toBe('offline');
    expect(await shortTtl.getOnlineUsers()).toEqual([]);

    shortTtl.dispose();
    vi.useRealTimers();
  });
});

describe('createPresenceManager factory', () => {
  it('returns InMemoryPresenceManager when no redis config', () => {
    const pm = createPresenceManager();
    expect(pm).toBeInstanceOf(InMemoryPresenceManager);
  });
});
