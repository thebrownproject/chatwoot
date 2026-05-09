import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../drizzle');

export async function runMigrations(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    console.log('Migrations complete.');
  } finally {
    await client.end();
  }
}

// Run directly via `tsx src/migrate.ts`
if (process.argv[1]?.match(/\/migrate\.[tj]s$/)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL environment variable is required.');
    process.exit(1);
  }
  runMigrations(url).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
