import type { ChannelAdapter, ChannelType } from './types.js';

/**
 * In-memory channel adapter registry (singleton). Populated once at startup.
 * Safe for multi-process: each process registers the same static set of adapters.
 * No Redis replacement needed -- this is configuration, not mutable runtime state.
 */
const adapters = new Map<ChannelType, ChannelAdapter>();

export function registerAdapter(adapter: ChannelAdapter): void {
  if (adapters.has(adapter.type)) {
    throw new Error(`Channel adapter already registered for type: ${adapter.type}`);
  }
  adapters.set(adapter.type, adapter);
}

export function getAdapter(type: ChannelType): ChannelAdapter {
  const adapter = adapters.get(type);
  if (!adapter) {
    throw new Error(`No channel adapter registered for type: ${type}`);
  }
  return adapter;
}

export function listAdapters(): ChannelType[] {
  return [...adapters.keys()];
}

/** Reset the adapter registry. For testing only. */
export function clearAdapters(): void {
  adapters.clear();
}
