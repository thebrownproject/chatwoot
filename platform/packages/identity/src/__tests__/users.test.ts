import { describe, it, expect, vi } from 'vitest';
import {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByClerkId,
  updateUser,
  listUsers,
  findOrCreateContact,
} from '../data/users.js';
import { makeUser, mockUserDb } from './helpers.js';

describe('createUser', () => {
  it('inserts a new human_agent', async () => {
    const db = mockUserDb();
    const result = await createUser(db, {
      type: 'human_agent',
      name: 'Bob',
      email: 'bob@buildpass.com.au',
    });
    expect(db.insert).toHaveBeenCalledWith({
      type: 'human_agent',
      name: 'Bob',
      email: 'bob@buildpass.com.au',
    });
    expect(result.name).toBe('Bob');
  });

  it('deduplicates contacts by email', async () => {
    const existing = makeUser({
      id: 'u-existing',
      type: 'contact',
      email: 'dupe@example.com',
    });
    const db = mockUserDb({
      findByEmail: vi.fn().mockResolvedValue(existing),
    });

    const result = await createUser(db, {
      type: 'contact',
      name: 'Duplicate',
      email: 'dupe@example.com',
    });

    expect(result.id).toBe('u-existing');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('does not dedup contacts when email is missing', async () => {
    const db = mockUserDb();
    await createUser(db, { type: 'contact', name: 'No Email' });
    expect(db.findByEmail).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it('does not dedup non-contact types', async () => {
    const db = mockUserDb();
    await createUser(db, {
      type: 'human_agent',
      name: 'Agent',
      email: 'agent@buildpass.com.au',
    });
    expect(db.findByEmail).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it('creates new contact when existing email belongs to a non-contact', async () => {
    const agent = makeUser({
      id: 'u-agent',
      type: 'human_agent',
      email: 'shared@buildpass.com.au',
    });
    const db = mockUserDb({
      findByEmail: vi.fn().mockResolvedValue(agent),
    });

    const result = await createUser(db, {
      type: 'contact',
      name: 'Contact',
      email: 'shared@buildpass.com.au',
    });

    expect(db.insert).toHaveBeenCalled();
    expect(result.id).toBe('u-new');
  });
});

describe('getUserById', () => {
  it('returns user when found', async () => {
    const user = makeUser();
    const db = mockUserDb({ findById: vi.fn().mockResolvedValue(user) });
    const result = await getUserById(db, 'u-1');
    expect(result).toEqual(user);
    expect(db.findById).toHaveBeenCalledWith('u-1');
  });

  it('returns null when not found', async () => {
    const db = mockUserDb();
    const result = await getUserById(db, 'u-missing');
    expect(result).toBeNull();
  });
});

describe('getUserByEmail', () => {
  it('returns user when found', async () => {
    const user = makeUser();
    const db = mockUserDb({ findByEmail: vi.fn().mockResolvedValue(user) });
    const result = await getUserByEmail(db, 'alice@buildpass.com.au');
    expect(result).toEqual(user);
  });
});

describe('getUserByClerkId', () => {
  it('returns user when found', async () => {
    const user = makeUser({ clerk_id: 'clerk_123' });
    const db = mockUserDb({ findByClerkId: vi.fn().mockResolvedValue(user) });
    const result = await getUserByClerkId(db, 'clerk_123');
    expect(result).toEqual(user);
  });
});

describe('updateUser', () => {
  it('updates and returns the user', async () => {
    const updated = makeUser({ name: 'Alice Updated' });
    const db = mockUserDb({ update: vi.fn().mockResolvedValue(updated) });
    const result = await updateUser(db, 'u-1', { name: 'Alice Updated' });
    expect(result?.name).toBe('Alice Updated');
    expect(db.update).toHaveBeenCalledWith('u-1', { name: 'Alice Updated' });
  });

  it('returns null when user not found', async () => {
    const db = mockUserDb();
    const result = await updateUser(db, 'u-missing', { name: 'Nope' });
    expect(result).toBeNull();
  });
});

describe('listUsers', () => {
  it('returns users with default pagination', async () => {
    const users = [makeUser()];
    const db = mockUserDb({ list: vi.fn().mockResolvedValue(users) });
    const result = await listUsers(db);
    expect(result).toEqual(users);
    expect(db.list).toHaveBeenCalledWith({
      type: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('passes type filter', async () => {
    const db = mockUserDb();
    await listUsers(db, { type: 'ai_agent' });
    expect(db.list).toHaveBeenCalledWith({
      type: 'ai_agent',
      limit: 50,
      offset: 0,
    });
  });

  it('passes custom limit and offset', async () => {
    const db = mockUserDb();
    await listUsers(db, { limit: 10, offset: 20 });
    expect(db.list).toHaveBeenCalledWith({
      type: undefined,
      limit: 10,
      offset: 20,
    });
  });
});

describe('findOrCreateContact', () => {
  it('returns existing contact by email', async () => {
    const existing = makeUser({
      id: 'u-existing',
      type: 'contact',
      email: 'customer@example.com',
    });
    const db = mockUserDb({
      findByEmail: vi.fn().mockResolvedValue(existing),
    });

    const result = await findOrCreateContact(db, 'customer@example.com');
    expect(result.id).toBe('u-existing');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('creates new contact when none exists', async () => {
    const db = mockUserDb();
    const result = await findOrCreateContact(
      db,
      'new@example.com',
      'New Person',
    );
    expect(db.insert).toHaveBeenCalledWith({
      type: 'contact',
      name: 'New Person',
      email: 'new@example.com',
    });
    expect(result.id).toBe('u-new');
  });

  it('uses email as name when name not provided', async () => {
    const db = mockUserDb();
    await findOrCreateContact(db, 'noname@example.com');
    expect(db.insert).toHaveBeenCalledWith({
      type: 'contact',
      name: 'noname@example.com',
      email: 'noname@example.com',
    });
  });

  it('creates new contact when existing email belongs to a non-contact', async () => {
    const agent = makeUser({
      type: 'human_agent',
      email: 'agent@buildpass.com.au',
    });
    const db = mockUserDb({
      findByEmail: vi.fn().mockResolvedValue(agent),
    });

    const result = await findOrCreateContact(
      db,
      'agent@buildpass.com.au',
      'Contact',
    );
    expect(db.insert).toHaveBeenCalled();
    expect(result.id).toBe('u-new');
  });
});
