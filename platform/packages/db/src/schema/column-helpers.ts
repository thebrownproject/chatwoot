/**
 * Shared column config for timestamp with timezone columns.
 * All timestamps in the schema use `timestamptz` (Postgres) with Date mode.
 */
export const tz = { withTimezone: true, mode: 'date' } as const;

/**
 * Shared custom type for tsvector full-text search columns.
 */
export { tsvector } from './custom-types.js';
