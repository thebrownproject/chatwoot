import type { ChannelConfig, ChannelType } from '../types.js';

/**
 * Channel data access functions.
 *
 * All functions take a `db` object as the first parameter to keep the data
 * layer decoupled from any specific database client. The `db` interface is
 * intentionally minimal — callers (routes, actions) supply the connection.
 *
 * For MVP, this uses an in-memory store. Swap to Drizzle queries when the
 * @buildpass/db package is wired up.
 */

export interface ChannelDb {
  channels: Map<string, ChannelConfig>;
}

export function createChannelDb(): ChannelDb {
  return { channels: new Map() };
}

export function createChannel(
  db: ChannelDb,
  input: {
    id: string;
    type: ChannelType;
    name: string;
    config: Record<string, unknown>;
    active: boolean;
  },
): ChannelConfig {
  const now = new Date();
  const channel: ChannelConfig = {
    id: input.id,
    type: input.type,
    name: input.name,
    config: input.config,
    active: input.active,
    createdAt: now,
    updatedAt: now,
  };
  db.channels.set(channel.id, channel);
  return channel;
}

export function getChannelById(
  db: ChannelDb,
  id: string,
): ChannelConfig | undefined {
  return db.channels.get(id);
}

export function listChannels(
  db: ChannelDb,
  filters?: { type?: ChannelType; active?: boolean },
): ChannelConfig[] {
  let results = [...db.channels.values()];

  if (filters?.type !== undefined) {
    results = results.filter((c) => c.type === filters.type);
  }
  if (filters?.active !== undefined) {
    results = results.filter((c) => c.active === filters.active);
  }

  return results;
}

export function updateChannel(
  db: ChannelDb,
  id: string,
  updates: Partial<Pick<ChannelConfig, 'name' | 'config' | 'active'>>,
): ChannelConfig | undefined {
  const channel = db.channels.get(id);
  if (!channel) return undefined;

  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined),
  );
  if (Object.keys(filtered).length === 0) return channel;

  const updated: ChannelConfig = {
    ...channel,
    ...filtered,
    updatedAt: new Date(),
  };
  db.channels.set(id, updated);
  return updated;
}

export function deactivateChannel(
  db: ChannelDb,
  id: string,
): ChannelConfig | undefined {
  return updateChannel(db, id, { active: false });
}
