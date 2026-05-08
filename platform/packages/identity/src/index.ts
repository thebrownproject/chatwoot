// Types
export type {
  UserType,
  PermissionRole,
  Capability,
  AgentMetadata,
  ContactMetadata,
  UserMetadata,
  UserCreate,
  UserUpdate,
  User,
  SafeUser,
  Permission,
  UserListFilters,
  AuthContext,
} from './types.js';

export { sanitizeUser } from './types.js';

// Data layer
export {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByClerkId,
  updateUser,
  listUsers,
  findOrCreateContact,
} from './data/users.js';
export type { UserDb } from './data/users.js';

export {
  getPermission,
  setPermission,
  hasCapability,
} from './data/permissions.js';
export type { PermissionDb } from './data/permissions.js';

// Actions
export { findOrCreateContact as deduplicateContact } from './data/users.js';
export {
  createAuthMiddleware,
} from './actions/auth-middleware.js';
export type {
  AuthMiddlewareDeps,
  AuthEnv,
} from './actions/auth-middleware.js';

// Routes
export { createUserRoutes } from './routes/users.js';
export { createAuthRoutes } from './routes/auth.js';
export type { AuthRouteDeps } from './routes/auth.js';

// Manifest
export { manifest } from './manifest.js';
