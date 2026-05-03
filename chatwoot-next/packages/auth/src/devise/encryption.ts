import crypto from 'node:crypto';

/**
 * ActiveRecord Encryption interop.
 *
 * Chatwoot's `users.otp_secret` and `users.otp_backup_codes` are encrypted at
 * rest with ActiveRecord Encryption using a deterministic key (so values are
 * queryable). Three env vars drive the key derivation:
 *   - ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY
 *   - ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY
 *   - ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT
 *
 * Algorithm reference (see `activerecord/lib/active_record/encryption/`):
 *   - Cipher: AES-256-GCM.
 *   - Key derivation: PBKDF2-HMAC-SHA1 over the source key with the configured
 *     salt; 1000 iterations, 32-byte derived key.
 *   - Non-deterministic: random 12-byte IV. Auth tag captured separately.
 *   - Deterministic: IV is HMAC-SHA256(key, plaintext) truncated to 12 bytes,
 *     so identical plaintexts always produce the same ciphertext (enables
 *     equality lookups).
 *
 * Envelope (canonical JSON form):
 *   { "p": <base64-ciphertext>,
 *     "h": { "iv": <base64-iv>, "at": <base64-auth-tag> } }
 *
 * TODO: AR Encryption can also produce an "headers-on" format with extra
 * metadata under `h` (e.g., key references). Confirm format with a real
 * Rails-encrypted blob during integration testing. For now, support the
 * canonical format above.
 */

export type ActiveRecordEncryptionKeys = {
  primary: string;
  deterministic: string;
  salt: string;
};

const PBKDF2_ITERATIONS = 1000;
const DERIVED_KEY_LENGTH = 32;

/**
 * Read the three env vars Rails uses for AR Encryption. Returns null if any
 * are missing so callers can decide how to surface the misconfiguration.
 */
export function loadEncryptionKeysFromEnv(): ActiveRecordEncryptionKeys | null {
  const primary = process.env.ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY;
  const deterministic = process.env.ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY;
  const salt = process.env.ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT;
  if (!primary || !deterministic || !salt) return null;
  return { primary, deterministic, salt };
}

type Envelope = {
  p: string;
  h: {
    iv: string;
    at: string;
  };
};

function deriveKey(rawKey: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(
    rawKey,
    salt,
    PBKDF2_ITERATIONS,
    DERIVED_KEY_LENGTH,
    'sha1',
  );
}

function pickKey(
  keys: ActiveRecordEncryptionKeys,
  deterministic: boolean,
): string {
  return deterministic ? keys.deterministic : keys.primary;
}

/**
 * Decrypt a value previously written by ActiveRecord Encryption. Set
 * `deterministic` to true for columns declared with
 * `encrypts :col, deterministic: true` (e.g. `otp_secret`).
 */
export function decrypt(
  blob: string,
  keys: ActiveRecordEncryptionKeys,
  deterministic: boolean,
): string {
  let envelope: Envelope;
  try {
    envelope = JSON.parse(blob) as Envelope;
  } catch {
    throw new Error('not an AR-encrypted blob');
  }
  if (!envelope || !envelope.p || !envelope.h || !envelope.h.iv || !envelope.h.at) {
    throw new Error('not an AR-encrypted blob');
  }

  const derivedKey = deriveKey(pickKey(keys, deterministic), keys.salt);
  const iv = Buffer.from(envelope.h.iv, 'base64');
  const ciphertext = Buffer.from(envelope.p, 'base64');
  const authTag = Buffer.from(envelope.h.at, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Encrypt a value in a format ActiveRecord Encryption can read back. Used
 * when Next.js writes encrypted columns Rails will later decrypt during the
 * cutover (e.g. enrolling a new TOTP secret).
 */
export function encrypt(
  plaintext: string,
  keys: ActiveRecordEncryptionKeys,
  deterministic: boolean,
): string {
  const derivedKey = deriveKey(pickKey(keys, deterministic), keys.salt);

  const iv = deterministic
    ? crypto
        .createHmac('sha256', derivedKey)
        .update(plaintext, 'utf8')
        .digest()
        .subarray(0, 12)
    : crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const envelope: Envelope = {
    p: ciphertext.toString('base64'),
    h: {
      iv: iv.toString('base64'),
      at: authTag.toString('base64'),
    },
  };
  return JSON.stringify(envelope);
}
