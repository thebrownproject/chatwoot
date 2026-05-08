import type { Permission, PermissionRole, Capability } from '../types.js';

/**
 * Database interface for permission operations.
 * Implemented by the @buildpass/db Drizzle adapter; mockable in tests.
 */
export interface PermissionDb {
  findByUserId(userId: string): Promise<Permission | null>;
  upsert(
    userId: string,
    role: PermissionRole,
    capabilities: string[],
  ): Promise<Permission>;
}

/** Get a user's permission record */
export async function getPermission(
  db: PermissionDb,
  userId: string,
): Promise<Permission | null> {
  return db.findByUserId(userId);
}

/** Upsert a user's permission: set role and capabilities */
export async function setPermission(
  db: PermissionDb,
  userId: string,
  role: PermissionRole,
  capabilities: string[],
): Promise<Permission> {
  return db.upsert(userId, role, capabilities);
}

/** Check if a user has a specific capability */
export async function hasCapability(
  db: PermissionDb,
  userId: string,
  capability: Capability,
): Promise<boolean> {
  const perm = await db.findByUserId(userId);
  if (!perm) return false;
  return perm.capabilities.includes(capability);
}
