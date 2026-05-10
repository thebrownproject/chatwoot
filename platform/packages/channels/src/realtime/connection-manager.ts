import type { WebSocket } from 'ws';
import type { WsServerEvent } from '../types.js';

export interface ConnectionInfo {
  ws: WebSocket;
  userId: string;
  userName: string;
  isAuthenticated: boolean;
  subscribedConversations: Set<string>;
}

/**
 * Tracks WebSocket connections per user, manages conversation subscriptions,
 * and handles broadcast/online status.
 *
 * Instance-scoped state (not module-level). Each process owns its own instance.
 * For multi-process deployment, pair with Redis pub/sub to fan out events across
 * processes -- each ConnectionManager handles only its local WebSocket connections.
 */
export class ConnectionManager {
  /** ws instance -> connection metadata */
  private connections = new Map<WebSocket, ConnectionInfo>();
  /** userId -> set of ws instances (one user can have multiple tabs) */
  private userConnections = new Map<string, Set<WebSocket>>();
  /** conversationId -> set of ws instances subscribed */
  private conversationSubscribers = new Map<string, Set<WebSocket>>();

  add(ws: WebSocket, info: Omit<ConnectionInfo, 'subscribedConversations'>): void {
    const connInfo: ConnectionInfo = {
      ...info,
      subscribedConversations: new Set(),
    };
    this.connections.set(ws, connInfo);

    let userSet = this.userConnections.get(info.userId);
    if (!userSet) {
      userSet = new Set();
      this.userConnections.set(info.userId, userSet);
    }
    userSet.add(ws);
  }

  remove(ws: WebSocket): ConnectionInfo | undefined {
    const info = this.connections.get(ws);
    if (!info) return undefined;

    for (const convId of info.subscribedConversations) {
      const subs = this.conversationSubscribers.get(convId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          this.conversationSubscribers.delete(convId);
        }
      }
    }

    const userSet = this.userConnections.get(info.userId);
    if (userSet) {
      userSet.delete(ws);
      if (userSet.size === 0) {
        this.userConnections.delete(info.userId);
      }
    }

    this.connections.delete(ws);
    return info;
  }

  subscribe(ws: WebSocket, conversationId: string): boolean {
    const info = this.connections.get(ws);
    if (!info) return false;

    info.subscribedConversations.add(conversationId);

    let subs = this.conversationSubscribers.get(conversationId);
    if (!subs) {
      subs = new Set();
      this.conversationSubscribers.set(conversationId, subs);
    }
    subs.add(ws);
    return true;
  }

  unsubscribe(ws: WebSocket, conversationId: string): boolean {
    const info = this.connections.get(ws);
    if (!info) return false;

    info.subscribedConversations.delete(conversationId);

    const subs = this.conversationSubscribers.get(conversationId);
    if (subs) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.conversationSubscribers.delete(conversationId);
      }
    }
    return true;
  }

  broadcastToConversation(
    conversationId: string,
    event: WsServerEvent,
    excludeWs?: WebSocket,
  ): void {
    const subs = this.conversationSubscribers.get(conversationId);
    if (subs) this.sendToAll(subs, event, excludeWs);
  }

  sendToUser(userId: string, event: WsServerEvent): void {
    const userSet = this.userConnections.get(userId);
    if (userSet) this.sendToAll(userSet, event);
  }

  broadcastAll(event: WsServerEvent, excludeWs?: WebSocket): void {
    this.sendToAll([...this.connections.keys()], event, excludeWs);
  }

  private sendToAll(
    targets: Iterable<WebSocket>,
    event: WsServerEvent,
    excludeWs?: WebSocket,
  ): void {
    const payload = JSON.stringify(event);
    for (const ws of targets) {
      if (ws !== excludeWs && ws.readyState === ws.OPEN) {
        try {
          ws.send(payload);
        } catch {
          // Connection may close between readyState check and send; skip it
        }
      }
    }
  }

  getConnection(ws: WebSocket): ConnectionInfo | undefined {
    return this.connections.get(ws);
  }

  isUserOnline(userId: string): boolean {
    const userSet = this.userConnections.get(userId);
    return userSet !== undefined && userSet.size > 0;
  }

  getOnlineUserIds(): string[] {
    return [...this.userConnections.keys()];
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConversationSubscriberCount(conversationId: string): number {
    return this.conversationSubscribers.get(conversationId)?.size ?? 0;
  }

  /** Clear all connection state. For testing only. */
  reset(): void {
    this.connections.clear();
    this.userConnections.clear();
    this.conversationSubscribers.clear();
  }
}
