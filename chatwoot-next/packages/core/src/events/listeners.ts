import type { DomainEvent } from './publish.js';

export type Listener = (event: DomainEvent) => Promise<void>;

/**
 * listenerRegistry — replaces Rails `app/listeners/` (and the AR callbacks
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

  async dispatch(event: DomainEvent): Promise<void> {
    const bucket = this.listeners.get(event.event);
    if (!bucket) return;

    await Promise.all(
      Array.from(bucket).map(async (listener) => {
        try {
          await listener(event);
        } catch (_err) {
          // TODO: wire structured logger (pino) — swallow + log so a single
          // bad listener does not break the dispatch chain.
        }
      }),
    );
  }
}

export const listenerRegistry = new ListenerRegistry();
