/**
 * Browser-side realtime client. Replaces
 * `app/javascript/shared/helpers/BaseActionCableConnector.js` (Rails
 * ActionCable) with a socket.io-client transport that talks to
 * `apps/realtime`.
 */

import { io, type Socket } from 'socket.io-client';

import type { RealtimeEvent, RealtimeEventName } from './events';

const PRESENCE_INTERVAL_MS = 20_000; // mirrors BaseActionCableConnector
const RECONNECT_INTERVAL_MS = 1_000; // mirrors BaseActionCableConnector

export type PresenceStatus = 'online' | 'offline' | 'busy';

export interface RealtimeClientOptions {
  url: string;
  pubsubToken?: string;
  accountId?: number | string;
  userId?: number | string;
  /**
   * Bearer-style auth token used for cross-domain WS auth (widget). The
   * server treats it as an alias for `pubsubToken` during the handshake.
   */
  token?: string;
}

export type RealtimeListener<T = unknown> = (data: T) => void;

type RealtimeEventDataFor<E extends RealtimeEventName> = Extract<
  RealtimeEvent,
  { event: E }
>['data'];

export interface RealtimeClient {
  on<E extends RealtimeEventName>(
    event: E,
    cb: RealtimeListener<RealtimeEventDataFor<E>>,
  ): void;
  on(event: string, cb: RealtimeListener): void;
  off<E extends RealtimeEventName>(
    event: E,
    cb: RealtimeListener<RealtimeEventDataFor<E>>,
  ): void;
  off(event: string, cb: RealtimeListener): void;
  connect(): void;
  disconnect(): void;
  updatePresence(status: PresenceStatus): void;
  joinConversation(conversationId: number | string): void;
  leaveConversation(conversationId: number | string): void;
}

export function createRealtimeClient(
  options: RealtimeClientOptions,
): RealtimeClient {
  const { url, pubsubToken, accountId, userId, token } = options;

  let socket: Socket | null = null;
  let presenceTimer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Map<string, Set<RealtimeListener>>();

  const startPresenceHeartbeat = () => {
    stopPresenceHeartbeat();
    presenceTimer = setInterval(() => {
      socket?.emit('presence:heartbeat');
    }, PRESENCE_INTERVAL_MS);
  };

  const stopPresenceHeartbeat = () => {
    if (presenceTimer) {
      clearInterval(presenceTimer);
      presenceTimer = null;
    }
  };

  const attachListeners = (target: Socket) => {
    for (const [event, set] of listeners) {
      for (const cb of set) {
        target.on(event, cb);
      }
    }
  };

  function on(event: string, cb: RealtimeListener): void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(cb);
    socket?.on(event, cb);
  }

  function off(event: string, cb: RealtimeListener): void {
    listeners.get(event)?.delete(cb);
    socket?.off(event, cb);
  }

  return {
    connect() {
      if (socket) return;
      socket = io(url, {
        auth: {
          pubsubToken: token ?? pubsubToken,
          accountId,
          userId,
        },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: RECONNECT_INTERVAL_MS,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        startPresenceHeartbeat();
      });

      socket.on('disconnect', () => {
        stopPresenceHeartbeat();
      });

      attachListeners(socket);
    },

    disconnect() {
      stopPresenceHeartbeat();
      socket?.disconnect();
      socket = null;
    },

    on(event: string, cb: RealtimeListener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb);
      socket?.on(event, cb);
    },

    off(event: string, cb: RealtimeListener) {
      listeners.get(event)?.delete(cb);
      socket?.off(event, cb);
    },

    updatePresence(status: PresenceStatus) {
      socket?.emit('presence:update', { status });
    },

    joinConversation(conversationId) {
      socket?.emit('conversation:join', { conversationId });
    },

    leaveConversation(conversationId) {
      socket?.emit('conversation:leave', { conversationId });
    },
  };
}
