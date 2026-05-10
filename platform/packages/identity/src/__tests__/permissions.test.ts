import { describe, it, expect, vi } from 'vitest';
import {
  getPermission,
  setPermission,
  hasCapability,
  roleIncludes,
  type PermissionDb,
} from '../data/permissions.js';

function mockPermissionDb(overrides: Partial<PermissionDb> = {}): PermissionDb {
  return {
    findByUserId: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockImplementation(async (userId, role, capabilities) => ({
      id: 'perm-1',
      userId,
      role,
      capabilities,
    })),
    ...overrides,
  };
}

describe('getPermission', () => {
  it('returns permission record when found', async () => {
    const perm = { id: 'p-1', userId: 'u-1', role: 'agent' as const, capabilities: ['assign'] };
    const db = mockPermissionDb({ findByUserId: vi.fn().mockResolvedValue(perm) });
    const result = await getPermission(db, 'u-1');
    expect(result).toEqual(perm);
  });

  it('returns null when not found', async () => {
    const db = mockPermissionDb();
    const result = await getPermission(db, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('setPermission', () => {
  it('upserts role and capabilities', async () => {
    const db = mockPermissionDb();
    const result = await setPermission(db, 'u-1', 'admin', ['assign', 'resolve', 'manage_kb']);
    expect(result.role).toBe('admin');
    expect(result.capabilities).toEqual(['assign', 'resolve', 'manage_kb']);
    expect(db.upsert).toHaveBeenCalledWith('u-1', 'admin', ['assign', 'resolve', 'manage_kb']);
  });

  it('throws on invalid role', async () => {
    const db = mockPermissionDb();
    await expect(
      setPermission(db, 'u-1', 'superadmin' as never, ['assign']),
    ).rejects.toThrow('Invalid role: superadmin');
  });

  it('accepts all valid roles', async () => {
    const db = mockPermissionDb();
    for (const role of ['admin', 'agent', 'contact', 'bot'] as const) {
      await expect(setPermission(db, 'u-1', role, [])).resolves.toBeDefined();
    }
  });
});

describe('hasCapability', () => {
  it('returns true when user has the capability', async () => {
    const perm = { id: 'p-1', userId: 'u-1', role: 'agent' as const, capabilities: ['assign', 'resolve'] };
    const db = mockPermissionDb({ findByUserId: vi.fn().mockResolvedValue(perm) });
    expect(await hasCapability(db, 'u-1', 'assign')).toBe(true);
    expect(await hasCapability(db, 'u-1', 'resolve')).toBe(true);
  });

  it('returns false when user lacks the capability', async () => {
    const perm = { id: 'p-1', userId: 'u-1', role: 'agent' as const, capabilities: ['assign'] };
    const db = mockPermissionDb({ findByUserId: vi.fn().mockResolvedValue(perm) });
    expect(await hasCapability(db, 'u-1', 'manage_kb')).toBe(false);
  });

  it('returns false when user has no permission record', async () => {
    const db = mockPermissionDb();
    expect(await hasCapability(db, 'u-1', 'assign')).toBe(false);
  });

  it('returns false when capabilities array is empty', async () => {
    const perm = { id: 'p-1', userId: 'u-1', role: 'agent' as const, capabilities: [] as string[] };
    const db = mockPermissionDb({ findByUserId: vi.fn().mockResolvedValue(perm) });
    expect(await hasCapability(db, 'u-1', 'assign')).toBe(false);
  });
});

describe('roleIncludes', () => {
  it('admin includes all roles', () => {
    expect(roleIncludes('admin', 'admin')).toBe(true);
    expect(roleIncludes('admin', 'agent')).toBe(true);
    expect(roleIncludes('admin', 'bot')).toBe(true);
    expect(roleIncludes('admin', 'contact')).toBe(true);
  });

  it('agent only includes itself', () => {
    expect(roleIncludes('agent', 'agent')).toBe(true);
    expect(roleIncludes('agent', 'admin')).toBe(false);
    expect(roleIncludes('agent', 'bot')).toBe(false);
  });

  it('contact only includes itself', () => {
    expect(roleIncludes('contact', 'contact')).toBe(true);
    expect(roleIncludes('contact', 'admin')).toBe(false);
    expect(roleIncludes('contact', 'agent')).toBe(false);
  });

  it('bot only includes itself', () => {
    expect(roleIncludes('bot', 'bot')).toBe(true);
    expect(roleIncludes('bot', 'admin')).toBe(false);
  });
});
