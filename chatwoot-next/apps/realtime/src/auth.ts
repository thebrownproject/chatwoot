/**
 * Socket.io auth middleware.
 *
 * The Vue dashboard, widget and SDK all hand the realtime layer a
 * `pubsubToken` (see `users.pubsub_token` and `contacts.pubsub_token` in the
 * Rails schema). The token is opaque, lives on the user/contact row, and is
 * the existing primary key for ActionCable identification — we keep the same
 * contract so clients don't change during cutover.
 */

import type { Socket as IoSocket } from 'socket.io';

export interface SocketAuthContext {
  kind: 'user' | 'contact';
  id: number;
  accountId: number | null;
  pubsubToken: string;
}

// Typed socket alias. Avoids global module augmentation of `socket.io` so the
// `data` slot is locally narrowed to `{ auth?: SocketAuthContext }` for the
// realtime app without conflicting with downstream consumers.
type AuthData = {
  auth?: SocketAuthContext;
  userId?: string;
  accountId?: string;
  pubsubToken?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthedSocket = IoSocket<any, any, any, AuthData>;

type NextFn = (err?: Error) => void;

const extractToken = (socket: AuthedSocket): string | null => {
  const auth = socket.handshake.auth as { pubsubToken?: unknown };
  if (typeof auth?.pubsubToken === 'string' && auth.pubsubToken.length > 0) {
    return auth.pubsubToken;
  }
  const header = socket.handshake.query?.pubsubToken;
  if (typeof header === 'string' && header.length > 0) return header;
  return null;
};

const lookupPubsubToken = async (
  _token: string
): Promise<SocketAuthContext | null> => {
  // TODO: query `users` and `contacts` via `@chatwoot-next/db` for the
  // matching `pubsub_token`. First match wins; null = unauthenticated.
  // Stubbed for the skeleton.
  return null;
};

export const authMiddleware = async (
  socket: AuthedSocket,
  next: NextFn
): Promise<void> => {
  const token = extractToken(socket);
  if (!token) {
    next(new Error('missing pubsubToken'));
    return;
  }

  const ctx = await lookupPubsubToken(token);
  if (!ctx) {
    next(new Error('invalid pubsubToken'));
    return;
  }

  socket.data.auth = ctx;
  next();
};
