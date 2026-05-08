import { describe, expect, it } from 'vitest';
import {
  decrypt,
  encrypt,
  loadEncryptionKeysFromEnv,
  type ActiveRecordEncryptionKeys,
} from './encryption';

const KEYS: ActiveRecordEncryptionKeys = {
  primary: 'primary-key-fixture-do-not-use-in-prod',
  deterministic: 'deterministic-key-fixture-do-not-use-in-prod',
  salt: 'derivation-salt-fixture',
};

describe('encrypt / decrypt round-trip', () => {
  it('round-trips non-deterministic mode', () => {
    const blob = encrypt('hello world', KEYS, false);
    expect(decrypt(blob, KEYS, false)).toBe('hello world');
  });

  it('round-trips deterministic mode', () => {
    const blob = encrypt('otp-secret-base32', KEYS, true);
    expect(decrypt(blob, KEYS, true)).toBe('otp-secret-base32');
  });

  it('produces identical ciphertext for identical plaintext in deterministic mode', () => {
    const a = encrypt('same-input', KEYS, true);
    const b = encrypt('same-input', KEYS, true);
    expect(a).toBe(b);
  });

  it('produces different ciphertext for identical plaintext in non-deterministic mode', () => {
    const a = encrypt('same-input', KEYS, false);
    const b = encrypt('same-input', KEYS, false);
    expect(a).not.toBe(b);
    // both must still decrypt back
    expect(decrypt(a, KEYS, false)).toBe('same-input');
    expect(decrypt(b, KEYS, false)).toBe('same-input');
  });

  it('throws on a non-AR-encrypted blob', () => {
    expect(() => decrypt('not-json', KEYS, false)).toThrow('not an AR-encrypted blob');
    expect(() => decrypt('{"foo":"bar"}', KEYS, false)).toThrow(
      'not an AR-encrypted blob',
    );
  });
});

describe('loadEncryptionKeysFromEnv', () => {
  it('returns null when any env var is missing', () => {
    const original = {
      primary: process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY,
      deterministic: process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY,
      salt: process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT,
    };
    delete process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY;
    delete process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY;
    delete process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT;
    try {
      expect(loadEncryptionKeysFromEnv()).toBeNull();
    } finally {
      if (original.primary !== undefined) {
        process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY = original.primary;
      }
      if (original.deterministic !== undefined) {
        process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY = original.deterministic;
      }
      if (original.salt !== undefined) {
        process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT = original.salt;
      }
    }
  });

  it('returns the populated record when all env vars are set', () => {
    const original = {
      primary: process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY,
      deterministic: process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY,
      salt: process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT,
    };
    process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY = 'p';
    process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY = 'd';
    process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT = 's';
    try {
      expect(loadEncryptionKeysFromEnv()).toEqual({
        primary: 'p',
        deterministic: 'd',
        salt: 's',
      });
    } finally {
      if (original.primary === undefined) {
        delete process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY;
      } else {
        process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY = original.primary;
      }
      if (original.deterministic === undefined) {
        delete process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY;
      } else {
        process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY = original.deterministic;
      }
      if (original.salt === undefined) {
        delete process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT;
      } else {
        process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT = original.salt;
      }
    }
  });
});
