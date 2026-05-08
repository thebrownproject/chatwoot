import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Context } from 'hono';

export const generateId = (): string => randomUUID();

export const zUuid = z.string().uuid();

export const zPagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export function jsonError(
  c: Context,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  details?: unknown,
) {
  return c.json(details ? { error: message, details } : { error: message }, status);
}
