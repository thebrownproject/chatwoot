import type { Permission, PermissionRole, Capability } from '../types.js';

const VALID_ROLES: ReadonlySet<string> = new Set<PermissionRole>([
  'admin',
  'agent',
  'contact',
  'bot',
]);

const ROLE_HIERARCHY: Record<PermissionRole, readonly PermissionRole[]> = {
  admin: ['admin', 'agent', 'bot', 'contact'],
  agent: ['agent'],
  bot: ['bot'],
  contact: ['contact'],
};

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
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
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

/** Check if a role includes another role in the hierarchy */
export function roleIncludes(
  role: PermissionRole,
  target: PermissionRole,
): boolean {
  return (ROLE_HIERARCHY[role] ?? []).includes(target);
}
