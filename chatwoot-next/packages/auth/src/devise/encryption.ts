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
 *   - Key derivation: PBKDF2-HMAC-SHA1 over (primary_key || deterministic_key)
 *     with the configured salt and the Rails default iteration count.
 *   - Non-deterministic: random 12-byte IV prefixed to ciphertext, GCM auth
 *     tag appended; serialized as a JSON envelope ({"p": <ct>, "h": {...}}).
 *   - Deterministic: IV is HMAC-SHA256(key, plaintext) truncated to 12 bytes,
 *     so identical plaintexts always produce the same ciphertext (enables
 *     equality lookups).
 */

export type ActiveRecordEncryptionKeys = {
  primary: string;
  deterministic: string;
  salt: string;
};

/**
 * Decrypt a value previously written by ActiveRecord Encryption. Set
 * `deterministic` to true for columns declared with
 * `encrypts :col, deterministic: true` (e.g. `otp_secret`).
 */
export function decrypt(
  _blob: string,
  _keys: ActiveRecordEncryptionKeys,
  _deterministic: boolean,
): string {
  // TODO: parse the JSON envelope, derive the AES-256-GCM key via PBKDF2 from
  // the primary (or deterministic) key + salt, then decrypt with the embedded
  // IV and auth tag. Mirror the Ruby implementation in
  // activerecord/lib/active_record/encryption/cipher/aes256_gcm.rb.
  throw new Error('decrypt: not implemented');
}

/**
 * Encrypt a value in a format ActiveRecord Encryption can read back. Used
 * when Next.js writes encrypted columns Rails will later decrypt during the
 * cutover (e.g. enrolling a new TOTP secret).
 */
export function encrypt(
  _plaintext: string,
  _keys: ActiveRecordEncryptionKeys,
  _deterministic: boolean,
): string {
  // TODO: derive the per-message key, generate the IV (random for
  // non-deterministic, HMAC-SHA256 of the plaintext for deterministic), run
  // AES-256-GCM, and emit the JSON envelope Rails expects.
  throw new Error('encrypt: not implemented');
}
