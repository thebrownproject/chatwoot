import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import {
  extractDeviseHeaders,
  mintDeviseToken,
  validateDeviseToken,
  type DeviseTokensJson,
} from './token-auth';

const RAW_TOKEN = 'plaintext-access-token';
const CLIENT = 'client-abc';
const UID = 'user@example.com';

function buildEntry(overrides: Partial<{
  token: string;
  expiry: number;
  last_token: string;
  updated_at: string;
}> = {}) {
  return {
    token: bcrypt.hashSync(RAW_TOKEN, 4),
    expiry: Math.floor(Date.now() / 1000) + 60 * 60,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('extractDeviseHeaders', () => {
  it('extracts the four headers from a Headers instance', () => {
    const headers = new Headers({
      'access-token': 'tok',
      client: 'cli',
      uid: 'me@example.com',
      expiry: '12345',
    });
    expect(extractDeviseHeaders(headers)).toEqual({
      accessToken: 'tok',
      client: 'cli',
      uid: 'me@example.com',
      expiry: 12345,
    });
  });

  it('returns null when any header is missing', () => {
    const headers = new Headers({
      'access-token': 'tok',
      client: 'cli',
      uid: 'me@example.com',
    });
    expect(extractDeviseHeaders(headers)).toBeNull();
  });

  it('returns null when expiry is not numeric', () => {
    const headers = new Headers({
      'access-token': 'tok',
      client: 'cli',
      uid: 'me@example.com',
      expiry: 'not-a-number',
    });
    expect(extractDeviseHeaders(headers)).toBeNull();
  });

  it('extracts headers from a Request instance', () => {
    const req = new Request('http://example.com/', {
      headers: {
        'access-token': 'tok',
        client: 'cli',
        uid: 'me@example.com',
        expiry: '999',
      },
    });
    expect(extractDeviseHeaders(req)).toMatchObject({ accessToken: 'tok' });
  });
});

describe('validateDeviseToken', () => {
  const tuple = {
    accessToken: RAW_TOKEN,
    client: CLIENT,
    uid: UID,
    expiry: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  it('returns no-tokens when tokensJson is null', async () => {
    expect(await validateDeviseToken(tuple, null)).toEqual({
      valid: false,
      reason: 'no-tokens',
    });
  });

  it('returns unknown-client when client id is missing', async () => {
    const tokens: DeviseTokensJson = { 'other-client': buildEntry() };
    expect(await validateDeviseToken(tuple, tokens)).toEqual({
      valid: false,
      reason: 'unknown-client',
    });
  });

  it('returns expired when entry.expiry is in the past', async () => {
    const tokens: DeviseTokensJson = {
      [CLIENT]: buildEntry({ expiry: Math.floor(Date.now() / 1000) - 10 }),
    };
    expect(await validateDeviseToken(tuple, tokens)).toEqual({
      valid: false,
      reason: 'expired',
    });
  });

  it('validates a matching access-token', async () => {
    const tokens: DeviseTokensJson = { [CLIENT]: buildEntry() };
    expect(await validateDeviseToken(tuple, tokens)).toEqual({ valid: true });
  });

  it('falls back to last_token within the grace window', async () => {
    const tokens: DeviseTokensJson = {
      [CLIENT]: buildEntry({
        token: bcrypt.hashSync('rotated-token', 4),
        last_token: bcrypt.hashSync(RAW_TOKEN, 4),
      }),
    };
    expect(await validateDeviseToken(tuple, tokens)).toEqual({ valid: true });
  });

  it('returns token-mismatch when neither token matches', async () => {
    const tokens: DeviseTokensJson = {
      [CLIENT]: buildEntry({
        token: bcrypt.hashSync('rotated-token', 4),
        last_token: bcrypt.hashSync('previous-token', 4),
      }),
    };
    expect(await validateDeviseToken(tuple, tokens)).toEqual({
      valid: false,
      reason: 'token-mismatch',
    });
  });
});

describe('mintDeviseToken', () => {
  it('mints a fresh entry that validateDeviseToken accepts', async () => {
    const minted = await mintDeviseToken(null);
    expect(minted.rawToken).toMatch(/^[a-f0-9]{40}$/);
    expect(minted.tuple.client).toMatch(/^[a-f0-9]{20}$/);
    expect(minted.tokens[minted.tuple.client]?.token).toMatch(/^\$2[aby]\$/);

    const result = await validateDeviseToken(
      { ...minted.tuple, uid: 'me@example.com' },
      minted.tokens,
    );
    expect(result).toEqual({ valid: true });
  });

  it('preserves the previous token as last_token on rotation', async () => {
    const first = await mintDeviseToken(null, 'rotating-client');
    const second = await mintDeviseToken(first.tokens, 'rotating-client');
    expect(second.tokens['rotating-client']?.last_token).toBe(
      first.tokens['rotating-client']?.token,
    );
  });

  it('caps the entries at 25, dropping the oldest by updated_at', async () => {
    const tokens: DeviseTokensJson = {};
    for (let i = 0; i < 25; i += 1) {
      tokens[`client-${i}`] = {
        token: bcrypt.hashSync(`tok-${i}`, 4),
        expiry: Math.floor(Date.now() / 1000) + 60 * 60,
        updated_at: new Date(2020, 0, 1, 0, 0, i).toISOString(),
      };
    }
    const minted = await mintDeviseToken(tokens, 'newest');
    const ids = Object.keys(minted.tokens);
    expect(ids.length).toBe(25);
    expect(ids).toContain('newest');
    expect(ids).not.toContain('client-0');
  });
});
