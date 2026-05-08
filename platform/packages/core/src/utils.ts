import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Context } from 'hono';

export const generateId = (): string => randomUUID();

export const zUuid = z.string().uuid();

export const zPagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseUuidParam(c: Context, param: string = 'id'): string | null {
  const value = c.req.param(param);
  return value && isValidUuid(value) ? value : null;
}

export const zSearchQuery = z.object({
  q: z.string().min(1).max(500),
});

export function jsonError(
  c: Context,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  details?: unknown,
) {
  return c.json(details ? { error: message, details } : { error: message }, status);
}
