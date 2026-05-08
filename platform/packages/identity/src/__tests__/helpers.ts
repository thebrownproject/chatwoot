import { vi } from 'vitest';
import type { UserDb } from '../data/users.js';
import type { User } from '../types.js';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-1',
    type: 'human_agent',
    name: 'Alice',
    email: 'alice@buildpass.com.au',
    avatarUrl: null,
    metadata: null,
    clerkId: null,
    apiKeyHash: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function mockUserDb(overrides: Partial<UserDb> = {}): UserDb {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByClerkId: vi.fn().mockResolvedValue(null),
    findByApiKeyHash: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockImplementation(async (data) =>
      makeUser({ ...data, id: 'u-new' }),
    ),
    update: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}
