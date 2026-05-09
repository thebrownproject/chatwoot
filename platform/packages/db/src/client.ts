import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export type Db = PostgresJsDatabase<typeof schema>;
/** @deprecated Use Db */
export type Database = Db;

export const createDb = (url: string): Db => {
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema });
};

/** @deprecated Use createDb */
export const createClient = createDb;

/** Lazy singleton -- only connects when first accessed. */
let _db: Db | undefined;
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!_db) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          'DATABASE_URL environment variable is not set. ' +
          'Set it in .env or environment before making database calls. ' +
          'See .env.example for required variables.'
        );
      }
      _db = createDb(url);
    }
    return Reflect.get(_db, prop, receiver);
  },
});
