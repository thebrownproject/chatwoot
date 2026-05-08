/**
 * Socket.io auth middleware.
 *
 * The Vue dashboard, widget and SDK all hand the realtime layer a
 * `pubsubToken` (see `users.pubsub_token` and `contact_inboxes.pubsub_token`
 * in the Rails schema). The token is opaque and is the existing primary key
 * for ActionCable identification — we keep the same contract so clients
 * don't change during cutover.
 *
 * The middleware:
 *   1. Pulls `pubsubToken` (or legacy `token`) plus `accountId` / `userId`
 *      out of `socket.handshake.auth`.
 *   2. Validates the token against `users.pubsub_token` then
 *      `contact_inboxes.pubsub_token` via `@chatwoot-next/db`, comparing in
 *      constant time with `crypto.timingSafeEqual` to avoid timing leaks.
 *   3. Caches the resolved `(kind, id, accountId)` for 30s in-process so a
 *      reconnect storm doesn't hammer Postgres.
 *   4. Stamps `socket.data.auth` with the resolved identity, or rejects via
 *      `next(new Error('unauthorized'))`.
 */

import { timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createClient, type DbClient } from '@chatwoot-next/db';
import type { Socket as IoSocket } from 'socket.io';

export interface SocketAuthContext {
  kind: 'user' | 'contact';
  id: bigint;
  accountId: bigint;
  pubsubToken: string;
}

type AuthData = {
  auth?: SocketAuthContext;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthedSocket = IoSocket<any, any, any, AuthData>;

type NextFn = (err?: Error) => void;

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 1_000;

interface CacheEntry {
  expiresAt: number;
  value: SocketAuthContext | null;
}

const tokenCache = new Map<string, CacheEntry>();

const cacheGet = (token: string): SocketAuthContext | null | undefined => {
  const entry = tokenCache.get(token);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    tokenCache.delete(token);
    return undefined;
  }
  // Refresh LRU ordering.
  tokenCache.delete(token);
  tokenCache.set(token, entry);
  return entry.value;
};

const cacheSet = (token: string, value: SocketAuthContext | null): void => {
  if (tokenCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = tokenCache.keys().next().value;
    if (oldest !== undefined) tokenCache.delete(oldest);
  }
  tokenCache.set(token, { expiresAt: Date.now() + CACHE_TTL_MS, value });
};

export const _clearAuthCacheForTests = (): void => {
  tokenCache.clear();
};

const safeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

const extractToken = (socket: AuthedSocket): string | null => {
  const auth = socket.handshake.auth as { pubsubToken?: unknown; token?: unknown };
  if (typeof auth?.pubsubToken === 'string' && auth.pubsubToken.length > 0) {
    return auth.pubsubToken;
  }
  if (typeof auth?.token === 'string' && auth.token.length > 0) {
    return auth.token;
  }
  const queryToken = socket.handshake.query?.pubsubToken;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;
  return null;
};

export interface PubsubLookupRow {
  id: string | number | bigint;
  account_id: string | number | bigint;
  pubsub_token: string;
  [key: string]: unknown;
}

export interface AuthDeps {
  db: DbClient;
}

let cachedDeps: AuthDeps | null = null;

const getDeps = (): AuthDeps => {
  if (cachedDeps) return cachedDeps;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for realtime auth');
  }
  cachedDeps = { db: createClient(url) };
  return cachedDeps;
};

export const _setAuthDepsForTests = (deps: AuthDeps | null): void => {
  cachedDeps = deps;
};

const toBigInt = (value: string | number | bigint): bigint => {
  if (typeof value === 'bigint') return value;
  return BigInt(value);
};

/**
 * Look up a pubsubToken in `users` and `contact_inboxes`. Returns the first
 * row whose `pubsub_token` matches in constant time, or `null`. We rely on
 * the Postgres index for selectivity but compare the returned token via
 * `timingSafeEqual` defensively.
 */
export const lookupPubsubToken = async (
  deps: AuthDeps,
  token: string,
): Promise<SocketAuthContext | null> => {
  const userRows = await deps.db.execute<PubsubLookupRow>(
    sql`SELECT id, account_id, pubsub_token FROM users WHERE pubsub_token = ${token} LIMIT 1`,
  );
  const userRow = (userRows as unknown as PubsubLookupRow[])[0];
  if (userRow && safeEqual(userRow.pubsub_token, token)) {
    return {
      kind: 'user',
      id: toBigInt(userRow.id),
      accountId: toBigInt(userRow.account_id),
      pubsubToken: token,
    };
  }

  const contactRows = await deps.db.execute<PubsubLookupRow>(
    sql`SELECT contact_id AS id, account_id, pubsub_token FROM contact_inboxes WHERE pubsub_token = ${token} LIMIT 1`,
  );
  const contactRow = (contactRows as unknown as PubsubLookupRow[])[0];
  if (contactRow && safeEqual(contactRow.pubsub_token, token)) {
    return {
      kind: 'contact',
      id: toBigInt(contactRow.id),
      accountId: toBigInt(contactRow.account_id),
      pubsubToken: token,
    };
  }

  return null;
};

export const authMiddleware = async (
  socket: AuthedSocket,
  next: NextFn,
): Promise<void> => {
  const token = extractToken(socket);
  if (!token) {
    next(new Error('unauthorized'));
    return;
  }

  const cached = cacheGet(token);
  if (cached !== undefined) {
    if (cached === null) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.auth = cached;
    next();
    return;
  }

  let ctx: SocketAuthContext | null = null;
  try {
    ctx = await lookupPubsubToken(getDeps(), token);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[realtime] pubsub token lookup failed', { err });
    next(new Error('unauthorized'));
    return;
  }

  cacheSet(token, ctx);

  if (!ctx) {
    next(new Error('unauthorized'));
    return;
  }

  socket.data.auth = ctx;
  next();
};
