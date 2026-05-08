import type { Db as DbClient } from '@buildpass/db';
import type { Context } from 'hono';

export type RouteEnv = {
  Variables: {
    db: DbClient;
    actorId: string;
  };
};

/** Parse an optional numeric query parameter, returning undefined if absent. */
export function numParam(c: Context, name: string): number | undefined {
  const raw = c.req.query(name);
  return raw !== undefined ? Number(raw) : undefined;
}
