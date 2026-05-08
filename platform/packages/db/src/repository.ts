/**
 * Unified repository pattern for the messaging platform.
 *
 * All modules should depend on `Repository` (injected via constructor)
 * rather than importing the `db` singleton directly. This enables:
 * - Testability (inject an in-memory or test DB)
 * - Transaction support (pass a tx as the db)
 * - Consistent data access patterns across modules
 *
 * Usage:
 *   import { Repository } from '@buildpass/db';
 *
 *   class MyService {
 *     constructor(private repo: Repository) {}
 *     async doSomething() {
 *       const rows = await this.repo.db.select().from(users);
 *     }
 *   }
 */
import type { Db } from './client.js';

export interface Repository {
  readonly db: Db;
}

/**
 * Default repository backed by the Drizzle db instance.
 * Modules receive this at construction time; tests can substitute a test DB.
 */
export class DrizzleRepository implements Repository {
  constructor(readonly db: Db) {}
}
