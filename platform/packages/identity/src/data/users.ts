import type {
  User,
  UserCreate,
  UserUpdate,
  UserListFilters,
} from '../types.js';

/**
 * Database interface for user operations.
 * Implemented by the @buildpass/db Drizzle adapter; mockable in tests.
 */
export interface UserDb {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  findByApiKeyHash(hash: string): Promise<User | null>;
  list(filters: UserListFilters): Promise<User[]>;
  insert(data: UserCreate): Promise<User>;
  update(id: string, data: UserUpdate): Promise<User | null>;
}

/** Create a user. For contacts, runs dedup check first (returns existing if found). */
export async function createUser(db: UserDb, data: UserCreate): Promise<User> {
  const name = data.name.trim();
  if (!name) {
    throw new Error('User name cannot be empty');
  }
  const normalizedData = {
    ...data,
    name,
    ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
  };
  if (normalizedData.type === 'contact' && normalizedData.email) {
    const existing = await db.findByEmail(normalizedData.email);
    if (existing && existing.type === 'contact') {
      return existing;
    }
  }
  return db.insert(normalizedData);
}

/** Get user by UUID */
export async function getUserById(
  db: UserDb,
  id: string,
): Promise<User | null> {
  return db.findById(id);
}

/** Get user by email (normalizes to lowercase) */
export async function getUserByEmail(
  db: UserDb,
  email: string,
): Promise<User | null> {
  return db.findByEmail(email.toLowerCase().trim());
}

/** Get user by Clerk ID */
export async function getUserByClerkId(
  db: UserDb,
  clerkId: string,
): Promise<User | null> {
  return db.findByClerkId(clerkId);
}

/** Update user (partial). Normalizes email to lowercase, trims name. */
export async function updateUser(
  db: UserDb,
  id: string,
  data: UserUpdate,
): Promise<User | null> {
  const normalized: UserUpdate = { ...data };
  if (normalized.name !== undefined) {
    normalized.name = normalized.name.trim();
    if (!normalized.name) {
      throw new Error('User name cannot be empty');
    }
  }
  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase().trim();
  }
  const hasChanges = Object.keys(normalized).length > 0;
  if (!hasChanges) {
    return db.findById(id);
  }
  return db.update(id, normalized);
}

/** List users, optionally filtered by type */
export async function listUsers(
  db: UserDb,
  filters: UserListFilters = {},
): Promise<User[]> {
  return db.list({
    type: filters.type,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });
}

/**
 * Find or create a contact by email (deduplication).
 * If a contact with the given email exists, returns it.
 * Otherwise creates a new contact.
 */
export async function findOrCreateContact(
  db: UserDb,
  email: string,
  name?: string,
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) {
    throw new Error('Email is required for contact deduplication');
  }
  const existing = await db.findByEmail(normalizedEmail);
  if (existing && existing.type === 'contact') {
    return existing;
  }
  const contactName = name?.trim() || normalizedEmail;
  return db.insert({
    type: 'contact',
    name: contactName,
    email: normalizedEmail,
  });
}
