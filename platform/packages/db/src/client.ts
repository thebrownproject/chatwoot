import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from './schema/index.js';

export type Db = NeonHttpDatabase<typeof schema>;

export const createDb = (url: string): Db => {
  const client = neon(url);
  return drizzle(client, { schema });
};

/** Lazy singleton -- only connects when first accessed. */
let _db: Db | undefined;
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = createDb(process.env.DATABASE_URL!);
    }
    return Reflect.get(_db, prop, receiver);
  },
});
