import { timingSafeEqual, scryptSync } from 'node:crypto';

/**
 * Verify an API key against a stored scrypt hash using timing-safe comparison.
 * Hash format: `<hex-salt>:<hex-derived-key>`
 */
export function verifyApiKeyScrypt(rawKey: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const salt = Buffer.from(parts[0], 'hex');
  const storedDerived = Buffer.from(parts[1], 'hex');

  let derived: Buffer;
  try {
    derived = scryptSync(rawKey, salt, storedDerived.length);
  } catch {
    return false;
  }

  if (derived.length !== storedDerived.length) return false;
  return timingSafeEqual(derived, storedDerived);
}
