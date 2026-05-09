import type { ChannelAdapter, ChannelType } from './types.js';

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

export function clearAdapters(): void {
  adapters.clear();
}
