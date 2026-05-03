import bcrypt from 'bcryptjs';

/**
 * Verify a plaintext password against a Devise-issued bcrypt hash.
 *
 * Devise stores bcrypt hashes in `users.encrypted_password` with the salt
 * embedded inside the hash string itself (standard `$2a$<cost>$<salt><hash>`
 * format, cost 11 in Chatwoot). bcryptjs verifies these directly — no
 * migration or rehashing is needed when reading from the existing column.
 */
export async function verifyDevisePassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
