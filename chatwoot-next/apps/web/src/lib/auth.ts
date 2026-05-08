// Auth.js v5 handlers + helpers for the Next.js app router.
// Builds the shared config from `@chatwoot-next/auth` against the local DB
// client and exposes the standard `{ handlers, auth, signIn, signOut }`
// quartet that route handlers and middleware consume.
import {
  NextAuth,
  buildAuthConfig,
  type NextAuthResult,
} from '@chatwoot-next/auth/auth-config';

import { db } from './db';

const config = buildAuthConfig({
  db,
  // TODO: replace with the real per-account SAML settings loader once the
  // `account_saml_settings` Drizzle query is wired in.
  samlSettingsLoader: () => Promise.resolve(null),
});

const result: NextAuthResult = NextAuth(config);

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
export const { GET, POST } = handlers;
