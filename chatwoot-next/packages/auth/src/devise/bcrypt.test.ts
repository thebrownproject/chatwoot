import { describe, expect, it } from 'vitest';
import { hashDevisePassword, verifyDevisePassword } from './bcrypt';

describe('verifyDevisePassword', () => {
  // Generated via `bcryptjs.hashSync('password', 11)` — stable Devise format.
  const KNOWN_HASH = '$2a$11$BBFNGetM9IbQHv3dlEAJfes80FQ8ugcN/lkmJoN7tnxFUDTbA.pdW';

  it('verifies a known plaintext against a Devise-format bcrypt hash', async () => {
    expect(await verifyDevisePassword('password', KNOWN_HASH)).toBe(true);
  });

  it('rejects an incorrect plaintext', async () => {
    expect(await verifyDevisePassword('wrong-password', KNOWN_HASH)).toBe(false);
  });

  it('returns false for an empty hash without throwing', async () => {
    expect(await verifyDevisePassword('password', '')).toBe(false);
  });
});

describe('hashDevisePassword', () => {
  it('round-trips through verifyDevisePassword', async () => {
    const hash = await hashDevisePassword('s3cret!', 4); // low cost for test speed
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyDevisePassword('s3cret!', hash)).toBe(true);
    expect(await verifyDevisePassword('nope', hash)).toBe(false);
  });
});
