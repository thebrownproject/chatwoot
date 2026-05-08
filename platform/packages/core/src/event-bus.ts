import type { EventMap } from './types.js';

type Handler<T> = (data: T) => Promise<void>;

export class EventBus {
  private handlers = new Map<string, Handler<unknown>[]>();

  /** Register a handler for an event type. */
  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler<unknown>);
    this.handlers.set(event, list);
  }

  /** Remove a specific handler for an event type. */
  off<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler as Handler<unknown>);
    if (idx !== -1) list.splice(idx, 1);
  }

  /** Emit an event, running all handlers sequentially. */
  async emit<K extends keyof EventMap>(
    event: K,
    data: EventMap[K],
  ): Promise<void> {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const handler of list) {
      await handler(data);
    }
  }

  /** Remove all handlers (useful for testing). */
  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
