// Re-export the workspace DB client configured from `DATABASE_URL`.
// The `@chatwoot-next/db` package owns connection pooling and the
// account-scoped client; consumers should call `db.forAccount(accountId)`.
import { createClient } from '@chatwoot-next/db';

export const db = createClient({
  connectionString: process.env.DATABASE_URL!,
});
