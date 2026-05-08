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
  const normalizedData = data.email
    ? { ...data, email: data.email.toLowerCase().trim() }
    : data;
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

/** Get user by email */
export async function getUserByEmail(
  db: UserDb,
  email: string,
): Promise<User | null> {
  return db.findByEmail(email);
}

/** Get user by Clerk ID */
export async function getUserByClerkId(
  db: UserDb,
  clerkId: string,
): Promise<User | null> {
  return db.findByClerkId(clerkId);
}

/** Update user (partial) */
export async function updateUser(
  db: UserDb,
  id: string,
  data: UserUpdate,
): Promise<User | null> {
  return db.update(id, data);
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
  const existing = await db.findByEmail(normalizedEmail);
  if (existing && existing.type === 'contact') {
    return existing;
  }
  return db.insert({
    type: 'contact',
    name: name ?? normalizedEmail,
    email: normalizedEmail,
  });
}
