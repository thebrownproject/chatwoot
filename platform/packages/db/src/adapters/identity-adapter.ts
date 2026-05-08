/**
 * Identity adapter — implements the identity module's expected DB interfaces
 * (UserDb, PermissionDb) using the Drizzle repository.
 *
 * Replaces the ad-hoc DI interfaces that the identity module was defining
 * locally with a concrete Drizzle-backed implementation.
 */
import { eq } from 'drizzle-orm';

import type { Db } from '../client.js';
import { users } from '../schema/users.js';
import { permissions } from '../schema/permissions.js';
import type { User, NewUser, Permission, NewPermission } from '../types.js';

/** Interface the identity module expects for user operations. */
export interface UserDb {
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  findByClerkId(clerkId: string): Promise<User | undefined>;
  create(data: NewUser): Promise<User>;
  update(id: string, data: Partial<NewUser>): Promise<User | undefined>;
  delete(id: string): Promise<void>;
}

/** Interface the identity module expects for permission operations. */
export interface PermissionDb {
  findByUserId(userId: string): Promise<Permission[]>;
  create(data: NewPermission): Promise<Permission>;
  delete(id: string): Promise<void>;
}

export class IdentityAdapter implements UserDb, PermissionDb {
  constructor(private readonly db: Db) {}

  // ── UserDb ───────────────────────────────────────────────────────

  async findById(id: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0];
  }

  async findByClerkId(clerkId: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    return rows[0];
  }

  async create(data: NewUser): Promise<User> {
    const rows = await this.db.insert(users).values(data).returning();
    return rows[0]!;
  }

  async update(
    id: string,
    data: Partial<NewUser>,
  ): Promise<User | undefined> {
    const rows = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  // ── PermissionDb ─────────────────────────────────────────────────

  async findByUserId(userId: string): Promise<Permission[]> {
    return this.db
      .select()
      .from(permissions)
      .where(eq(permissions.userId, userId));
  }

  async createPermission(data: NewPermission): Promise<Permission> {
    const rows = await this.db
      .insert(permissions)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async deletePermission(id: string): Promise<void> {
    await this.db.delete(permissions).where(eq(permissions.id, id));
  }
}
