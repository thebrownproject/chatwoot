/**
 * Browser-side realtime client. Replaces
 * `app/javascript/shared/helpers/BaseActionCableConnector.js` (Rails
 * ActionCable) with a socket.io-client transport that talks to
 * `apps/realtime`.
 *
 * Skeleton only — the full transport, reconnect, and presence wiring
 * lands when `apps/realtime` is built.
 */

import { io, type Socket } from 'socket.io-client';

import type { RealtimeEventName } from './events';

const PRESENCE_INTERVAL_MS = 20_000; // mirrors BaseActionCableConnector
const RECONNECT_INTERVAL_MS = 1_000; // mirrors BaseActionCableConnector

export type PresenceStatus = 'online' | 'offline' | 'busy';

export interface RealtimeClientOptions {
  url: string;
  pubsubToken: string;
  accountId: number;
  userId?: number;
}

export type RealtimeListener = (data: unknown) => void;

export interface RealtimeClient {
  on(event: RealtimeEventName | string, cb: RealtimeListener): void;
  off(event: RealtimeEventName | string, cb: RealtimeListener): void;
  connect(): void;
  disconnect(): void;
  updatePresence(status: PresenceStatus): void;
}

export function createRealtimeClient(
  options: RealtimeClientOptions
): RealtimeClient {
  const { url, pubsubToken, accountId, userId } = options;

  let socket: Socket | null = null;
  let presenceTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Map<string, Set<RealtimeListener>>();

  const startPresenceHeartbeat = () => {
    // TODO: emit `update_presence` to apps/realtime every PRESENCE_INTERVAL_MS,
    // mirroring BaseActionCableConnector#triggerPresenceInterval.
    presenceTimer = setTimeout(() => {
      socket?.emit('update_presence');
      startPresenceHeartbeat();
    }, PRESENCE_INTERVAL_MS);
  };

  const stopPresenceHeartbeat = () => {
    if (presenceTimer) {
      clearTimeout(presenceTimer);
      presenceTimer = null;
    }
  };

  const scheduleReconnect = () => {
    // TODO: poll connection state every RECONNECT_INTERVAL_MS, mirroring
    // BaseActionCableConnector#initReconnectTimer/checkConnection.
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      socket?.connect();
    }, RECONNECT_INTERVAL_MS);
  };

  return {
    connect() {
      // TODO: wire full auth/handshake against apps/realtime.
      socket = io(url, {
        auth: { pubsubToken, accountId, userId },
        autoConnect: true,
        reconnection: true,
      });

      socket.on('disconnect', scheduleReconnect);

      // Re-attach any listeners registered before connect().
      for (const [event, set] of listeners) {
        for (const cb of set) {
          socket.on(event, cb);
        }
      }

      startPresenceHeartbeat();
    },

    disconnect() {
      stopPresenceHeartbeat();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.disconnect();
      socket = null;
    },

    on(event, cb) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb);
      socket?.on(event, cb);
    },

    off(event, cb) {
      listeners.get(event)?.delete(cb);
      socket?.off(event, cb);
    },

    updatePresence(status) {
      // TODO: forward presence status to apps/realtime once the server
      // contract is finalised.
      socket?.emit('update_presence', { status });
    },
  };
}
