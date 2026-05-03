import type { DomainEvent } from './publish.js';

export type Listener = (event: DomainEvent) => Promise<void> | void;

/**
 * ListenerRegistry — replaces Rails `app/listeners/` (and the AR callbacks
 * those listeners replaced upstream). Listeners register themselves at boot
 * via `register(eventName, fn)`. The Enterprise package adds extra listeners
 * via the same registry — no overrides, just additional registrations.
 */
export class ListenerRegistry {
  private readonly listeners = new Map<string, Set<Listener>>();

  register(eventName: string, listener: Listener): void {
    let bucket = this.listeners.get(eventName);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(eventName, bucket);
    }
    bucket.add(listener);
  }

  unregister(eventName: string, listener: Listener): void {
    const bucket = this.listeners.get(eventName);
    if (!bucket) return;
    bucket.delete(listener);
    if (bucket.size === 0) this.listeners.delete(eventName);
  }

  async dispatch(eventName: string, event: DomainEvent): Promise<void> {
    const bucket = this.listeners.get(eventName);
    if (!bucket || bucket.size === 0) return;

    const results = await Promise.allSettled(
      Array.from(bucket, listener => Promise.resolve().then(() => listener(event))),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        // TODO: swap for pino once `packages/core` adopts a structured logger.
        // eslint-disable-next-line no-console
        console.warn('[ListenerRegistry] listener rejected', {
          eventName,
          reason: result.reason,
        });
      }
    }
  }
}

export const listenerRegistry = new ListenerRegistry();
