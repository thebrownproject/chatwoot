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
  avatar_url?: string | null;
  metadata?: UserMetadata | null;
  clerk_id?: string | null;
  api_key_hash?: string | null;
}

/** Input for updating a user */
export interface UserUpdate {
  name?: string;
  email?: string | null;
  avatar_url?: string | null;
  metadata?: UserMetadata | null;
}

/** A persisted user record */
export interface User {
  id: string;
  type: UserType;
  name: string;
  email: string | null;
  avatar_url: string | null;
  metadata: UserMetadata | null;
  clerk_id: string | null;
  api_key_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

/** A persisted permission record */
export interface Permission {
  id: string;
  user_id: string;
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
export type SafeUser = Omit<User, 'api_key_hash' | 'clerk_id'>;

/** Strip sensitive fields from a user record before returning in API responses */
export function sanitizeUser(user: User): SafeUser {
  const { api_key_hash: _apiKeyHash, clerk_id: _clerkId, ...safe } = user;
  return safe;
}

/** Auth context attached to Hono request context */
export interface AuthContext {
  user: User;
  method: 'clerk' | 'api_key';
}
