// Schema tables and relations
export * from './schema/index.js';

// Canonical types (single source of truth for all modules)
export * from './types.js';

// Database client
export { db, createDb, type Db } from './client.js';

// Repository pattern
export { DrizzleRepository, type Repository } from './repository.js';

// Module adapters
export * from './adapters/index.js';
