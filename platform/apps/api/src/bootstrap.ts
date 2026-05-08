import { bootstrap } from '@buildpass/core';

/**
 * Initialize cross-module event hooks.
 * Call this in index.ts on startup after the DB is ready.
 */
export function initializeHooks(db: any) {
  bootstrap(db);
}
