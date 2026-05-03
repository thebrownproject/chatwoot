import type { NextAuthConfig } from 'next-auth';

import type { LoadAccountSamlSettings } from './saml/provider';

/**
 * Options passed into `buildAuthConfig`.
 *
 * `db` is the Drizzle client (typed loosely here to avoid pulling
 * `@chatwoot-next/db` as a hard dependency at the package boundary). The
 * cutover plan requires Auth.js to also persist a devise-token_auth-shaped
 * row into `users.tokens` whenever a session is issued, so Rails accepts the
 * same session via its existing `DeviseTokenAuth::Concerns::SetUserByToken`
 * strategy.
 */
export type BuildAuthConfigOptions = {
  db: unknown;
  samlSettingsLoader: LoadAccountSamlSettings;
  cookieName?: string;
  google?: {
    clientId: string;
    clientSecret: string;
  };
};

/**
 * Build the Auth.js v5 config used by the Next.js app router.
 *
 * Providers (in order): credentials (devise bcrypt), optional Google OAuth,
 * and the multi-tenant SAML provider. Strategy is JWT so we don't need a
 * sessions table — the JWT is the source of truth for Auth.js while
 * `users.tokens` remains the source of truth for Rails.
 */
export function buildAuthConfig(
  _options: BuildAuthConfigOptions,
): NextAuthConfig {
  // TODO: assemble providers (Credentials wraps `verifyDevisePassword` and
  // optional 2FA via `verifyTotp`/`verifyBackupCode`; Google + SAML pulled
  // in conditionally).
  // TODO: in the `jwt` callback, after a successful sign-in, mint a
  // devise-token_auth tuple (random opaque accessToken + client uuid +
  // 2-month expiry) and write it into `users.tokens` via the supplied `db`,
  // then surface the tuple on the JWT so the client can mirror it into the
  // `cw_d_session_info` cookie. This is what lets Rails validate sessions
  // issued by Auth.js during the cutover.
  // TODO: respect `cookieName` (defaulting to `cw_d_session_info`) so the
  // existing frontend cookie convention keeps working.
  throw new Error('buildAuthConfig: not implemented');
}
