import type { EventMap } from './types.js';

type Handler<T> = (data: T) => Promise<void>;

export class EventBus {
  private handlers = new Map<string, Handler<unknown>[]>();

  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler<unknown>);
    this.handlers.set(event, list);
  }

  off<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler as Handler<unknown>);
    if (idx !== -1) list.splice(idx, 1);
  }

  async emit<K extends keyof EventMap>(
    event: K,
    data: EventMap[K],
  ): Promise<void> {
    const list = this.handlers.get(event);
    if (!list) return;
    const snapshot = [...list];
    for (const handler of snapshot) {
      try {
        await handler(data);
      } catch (err) {
        console.error(`EventBus handler error for ${String(event)}:`, err);
      }
    }
  }

  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.handlers.get(event)?.length ?? 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
