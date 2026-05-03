import type { DbClient } from './client';

export interface AccountScopedDb {
  db: DbClient;
  accountId: bigint;
}

// All queries through this scope must filter by account_id;
// actual filtering is enforced at the query helper level (TODO).
export const forAccount = (db: DbClient, accountId: bigint): AccountScopedDb => ({
  db,
  accountId,
});
