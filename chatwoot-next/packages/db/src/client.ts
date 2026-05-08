import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const createClient = (connectionString: string) =>
  drizzle(postgres(connectionString));

export type DbClient = ReturnType<typeof createClient>;
