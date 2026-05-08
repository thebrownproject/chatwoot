import { describe, it, expect, vi } from 'vitest';
import { findOrCreateContact as deduplicateContact } from '../data/users.js';
import { makeUser, mockUserDb } from './helpers.js';

describe('deduplicateContact', () => {
  it('returns existing contact when email matches', async () => {
    const existing = makeUser({
      id: 'u-existing',
      type: 'contact',
      email: 'jane@example.com',
    });
    const db = mockUserDb({
      findByEmail: vi.fn().mockResolvedValue(existing),
    });

    const result = await deduplicateContact(db, 'jane@example.com', 'Jane');
    expect(result.id).toBe('u-existing');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('creates new contact when no match', async () => {
    const db = mockUserDb();
    const result = await deduplicateContact(db, 'new@example.com', 'New');

    expect(db.insert).toHaveBeenCalledWith({
      type: 'contact',
      name: 'New',
      email: 'new@example.com',
    });
    expect(result.id).toBe('u-new');
  });

  it('uses email as fallback name', async () => {
    const db = mockUserDb();
    await deduplicateContact(db, 'noname@example.com');

    expect(db.insert).toHaveBeenCalledWith({
      type: 'contact',
      name: 'noname@example.com',
      email: 'noname@example.com',
    });
  });

  it('creates new contact when existing email belongs to a non-contact type', async () => {
    const agent = makeUser({
      id: 'u-agent',
      type: 'human_agent',
      email: 'shared@buildpass.com.au',
    });
    const db = mockUserDb({
      findByEmail: vi.fn().mockResolvedValue(agent),
    });

    const result = await deduplicateContact(
      db,
      'shared@buildpass.com.au',
      'Contact',
    );
    expect(db.insert).toHaveBeenCalled();
    expect(result.id).toBe('u-new');
  });
});
