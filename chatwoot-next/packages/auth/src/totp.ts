import { authenticator } from 'otplib';

/**
 * Verify a 6-digit TOTP code against a base32 secret. Wraps otplib so callers
 * don't depend on it directly and we can swap the implementation later.
 */
export function verifyTotp(secret: string, token: string): boolean {
  return authenticator.verify({ secret, token });
}

/**
 * Generate a new base32 TOTP secret suitable for `users.otp_secret`.
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export type VerifyBackupCodeResult = {
  valid: boolean;
  remaining: string[];
};

/**
 * Consume a single-use backup code. Returns the remaining codes minus the
 * matched one so the caller can persist the new array.
 *
 * TODO: Rails stores backup codes hashed (not plaintext). Confirm the hash
 * algorithm used by the Chatwoot devise-two-factor setup before implementing
 * the comparison — likely bcrypt, but verify against the model that defines
 * `otp_backup_codes` so this matches what Rails writes.
 */
export function verifyBackupCode(
  codes: string[],
  code: string,
): VerifyBackupCodeResult {
  const idx = codes.indexOf(code);
  if (idx === -1) return { valid: false, remaining: codes };

  const remaining = [...codes.slice(0, idx), ...codes.slice(idx + 1)];
  return { valid: true, remaining };
}
