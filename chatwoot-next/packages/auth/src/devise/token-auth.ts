import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

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
  last_token?: string;
  updated_at: string;
};

export type DeviseTokensJson = Record<string, DeviseTokenEntry>;

export type ValidateDeviseTokenResult = {
  valid: boolean;
  reason?: string;
};

const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 60; // 60 days
const MAX_CLIENT_TOKENS = 25; // devise-token_auth default
const TOKEN_BCRYPT_COST = 10; // devise-token_auth uses 10 for tokens

/**
 * Validate a devise-token_auth header tuple against a user's `tokens` JSON.
 *
 * Returns `{ valid: true }` if the access-token matches the stored bcrypt
 * hash for the supplied `client` and the entry has not expired. Falls back
 * to `last_token` to cover devise-token_auth's grace window for in-flight
 * requests.
 */
export async function validateDeviseToken(
  headers: DeviseTokenTuple,
  tokensJson: DeviseTokensJson | null | undefined,
): Promise<ValidateDeviseTokenResult> {
  if (!tokensJson) return { valid: false, reason: 'no-tokens' };

  const entry = tokensJson[headers.client];
  if (!entry) return { valid: false, reason: 'unknown-client' };

  const nowSeconds = Date.now() / 1000;
  if (nowSeconds > entry.expiry) return { valid: false, reason: 'expired' };

  if (await bcrypt.compare(headers.accessToken, entry.token)) {
    return { valid: true };
  }

  if (entry.last_token) {
    if (await bcrypt.compare(headers.accessToken, entry.last_token)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: 'token-mismatch' };
}

/**
 * Pull the four devise-token_auth headers off an incoming Request or Headers
 * instance. Returns null if any are missing, so callers can short-circuit
 * unauthenticated paths.
 */
export function extractDeviseHeaders(
  request: Request | Headers,
): DeviseTokenTuple | null {
  const headers = request instanceof Headers ? request : request.headers;
  const accessToken = headers.get('access-token');
  const client = headers.get('client');
  const uid = headers.get('uid');
  const expiryRaw = headers.get('expiry');

  if (!accessToken || !client || !uid || !expiryRaw) return null;

  const expiry = Number(expiryRaw);
  if (!Number.isFinite(expiry)) return null;

  return { accessToken, client, uid, expiry };
}

export type MintDeviseTokenResult = {
  tokens: DeviseTokensJson;
  tuple: DeviseTokenTuple;
  rawToken: string;
};

/**
 * Mint a fresh devise-token_auth entry for the given client. Returns the new
 * tokens JSON (caller persists it), the header tuple to send back (caller
 * fills `uid`), and the raw plaintext token for completeness.
 *
 * Rotation: if `clientId` already exists in `currentTokens`, the previous
 * hashed token is preserved as `last_token` so concurrent in-flight requests
 * keep working during the swap.
 */
export async function mintDeviseToken(
  currentTokens: DeviseTokensJson | null | undefined,
  clientId?: string,
): Promise<MintDeviseTokenResult> {
  const tokens: DeviseTokensJson = { ...(currentTokens ?? {}) };
  const client = clientId ?? crypto.randomBytes(10).toString('hex');
  const rawToken = crypto.randomBytes(20).toString('hex');
  const hashedToken = await bcrypt.hash(rawToken, TOKEN_BCRYPT_COST);
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;

  const previous = tokens[client];
  const entry: DeviseTokenEntry = {
    token: hashedToken,
    expiry,
    updated_at: new Date().toISOString(),
  };
  if (previous?.token) entry.last_token = previous.token;
  tokens[client] = entry;

  // Cap concurrent client entries; drop oldest by updated_at.
  const clientIds = Object.keys(tokens);
  if (clientIds.length > MAX_CLIENT_TOKENS) {
    const sorted = clientIds
      .map((id) => ({ id, updatedAt: tokens[id]?.updated_at ?? '' }))
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    const overflow = sorted.length - MAX_CLIENT_TOKENS;
    for (let i = 0; i < overflow; i += 1) {
      const drop = sorted[i];
      if (drop) delete tokens[drop.id];
    }
  }

  return {
    tokens,
    tuple: { accessToken: rawToken, client, uid: '', expiry },
    rawToken,
  };
}
