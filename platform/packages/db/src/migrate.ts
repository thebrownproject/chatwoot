import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../drizzle');

export async function runMigrations(databaseUrl: string) {
  const sql = neon(databaseUrl);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder });
  console.log('Migrations complete.');
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
