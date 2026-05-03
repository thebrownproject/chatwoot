/**
 * devise-token_auth compatible token validator.
 *
 * Rails stores per-client tokens in the `users.tokens` JSON column as a map:
 *   { [client_id]: { token: <bcrypt-hash>, expiry: <unix-seconds>,
 *                    last_token: <bcrypt-hash | null>, updated_at: <iso> } }
 *
 * The plaintext `access-token` is sent in headers and bcrypt-compared against
 * the stored hash for the matching `client`. Lifetime in Chatwoot is 2 months
 * and `change_headers_on_each_request: false`, so tokens are stable.
 */

export type DeviseTokenTuple = {
  accessToken: string;
  client: string;
  uid: string;
  expiry: number;
};

export type DeviseTokenEntry = {
  token: string;
  expiry: number;
  last_token?: string | null;
  updated_at?: string;
};

export type DeviseTokensJson = Record<string, DeviseTokenEntry>;

export type ValidateDeviseTokenResult = {
  valid: boolean;
  userId?: bigint;
};

/**
 * Validate a devise-token_auth header tuple against a user's `tokens` JSON.
 *
 * Returns `{ valid: true, userId }` if the access-token matches the stored
 * bcrypt hash for the supplied `client` and the entry has not expired.
 */
export function validateDeviseToken(
  headers: DeviseTokenTuple,
  tokensJson: DeviseTokensJson,
  userId?: bigint,
): ValidateDeviseTokenResult {
  const entry = tokensJson[headers.client];
  if (!entry) return { valid: false };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (entry.expiry && entry.expiry < nowSeconds) return { valid: false };

  // TODO: bcrypt-compare `headers.accessToken` against `entry.token` using
  // bcryptjs.compare. devise-token_auth hashes tokens with bcrypt before
  // persisting them, so plaintext equality won't match.
  // TODO: fall back to `entry.last_token` (devise-token_auth's grace window
  // for in-flight requests) when the primary token comparison fails and
  // `updated_at` is within the configured `batch_request_buffer_throttle`.

  const valid = false;
  return valid && userId !== undefined ? { valid, userId } : { valid: false };
}

/**
 * Pull the four devise-token_auth headers off an incoming Request. Returns
 * null if any are missing, so callers can short-circuit unauthenticated paths.
 */
export function extractDeviseHeaders(request: Request): DeviseTokenTuple | null {
  const accessToken = request.headers.get('access-token');
  const client = request.headers.get('client');
  const uid = request.headers.get('uid');
  const expiryRaw = request.headers.get('expiry');

  if (!accessToken || !client || !uid || !expiryRaw) return null;

  const expiry = Number(expiryRaw);
  if (!Number.isFinite(expiry)) return null;

  return { accessToken, client, uid, expiry };
}
