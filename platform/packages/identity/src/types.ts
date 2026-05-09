/** User type discriminator — humans, AI agents, contacts, and system */
export type UserType = 'human_agent' | 'ai_agent' | 'contact' | 'system';

/** Permission role */
export type PermissionRole = 'admin' | 'agent' | 'contact' | 'bot';

/** Known capability strings */
export type Capability =
  | 'assign'
  | 'resolve'
  | 'escalate'
  | 'view_internal'
  | 'manage_kb'
  | 'manage_users'
  | 'manage_channels'
  | (string & {});

/** Agent-specific metadata stored in User.metadata */
export interface AgentMetadata {
  model?: string;
  capabilities?: string[];
  version?: string;
  [key: string]: unknown;
}

/** Contact-specific metadata stored in User.metadata */
export interface ContactMetadata {
  company?: string;
  phone?: string;
  [key: string]: unknown;
}

/** User metadata — varies by type */
export type UserMetadata = AgentMetadata | ContactMetadata | Record<string, unknown>;

/** Input for creating a user */
export interface UserCreate {
  type: UserType;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  metadata?: UserMetadata | null;
}

/** Input for updating a user */
export interface UserUpdate {
  name?: string;
  email?: string | null;
  avatarUrl?: string | null;
  metadata?: UserMetadata | null;
}

/** A persisted user record (camelCase fields match Drizzle output) */
export interface User {
  id: string;
  type: UserType;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  metadata: UserMetadata | null;
  clerkId: string | null;
  apiKeyHash: string | null;
  apiKeyLookupHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A persisted permission record */
export interface Permission {
  id: string;
  userId: string;
  role: PermissionRole;
  capabilities: string[];
}

/** Filters for listing users */
export interface UserListFilters {
  type?: UserType;
  limit?: number;
  offset?: number;
}

/** A user record with sensitive fields stripped for API responses */
export type SafeUser = Omit<User, 'apiKeyHash' | 'apiKeyLookupHash' | 'clerkId'>;

/** Strip sensitive fields from a user record before returning in API responses */
export function sanitizeUser(user: User): SafeUser {
  const { apiKeyHash, apiKeyLookupHash, clerkId, ...safe } = user;
  void apiKeyHash;
  void apiKeyLookupHash;
  void clerkId;
  return safe;
}

/** Auth context attached to Hono request context */
export interface AuthContext {
  user: User;
  method: 'clerk' | 'api_key';
}
