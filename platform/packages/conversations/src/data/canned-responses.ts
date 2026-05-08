import { eq, ilike } from 'drizzle-orm';
import type { DbClient } from '@buildpass/db';
import { cannedResponses } from '@buildpass/db';
import type {
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  SearchCannedResponsesInput,
  CannedResponse,
} from '../types/canned-responses.js';

export async function createCannedResponse(
  db: DbClient,
  input: CreateCannedResponseInput,
): Promise<CannedResponse> {
  const [row] = await db
    .insert(cannedResponses)
    .values({
      title: input.title,
      body: input.body,
      bodyHtml: input.bodyHtml ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  return row as CannedResponse;
}

export async function getCannedResponseById(
  db: DbClient,
  id: string,
): Promise<CannedResponse | undefined> {
  const [row] = await db
    .select()
    .from(cannedResponses)
    .where(eq(cannedResponses.id, id))
    .limit(1);

  return row as CannedResponse | undefined;
}

export async function listCannedResponses(
  db: DbClient,
): Promise<CannedResponse[]> {
  const rows = await db
    .select()
    .from(cannedResponses)
    .orderBy(cannedResponses.title);

  return rows as CannedResponse[];
}

export async function updateCannedResponse(
  db: DbClient,
  id: string,
  input: UpdateCannedResponseInput,
): Promise<CannedResponse | undefined> {
  const [row] = await db
    .update(cannedResponses)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.bodyHtml !== undefined && { bodyHtml: input.bodyHtml ?? null }),
      updatedAt: new Date(),
    })
    .where(eq(cannedResponses.id, id))
    .returning();

  return row as CannedResponse | undefined;
}

export async function deleteCannedResponse(
  db: DbClient,
  id: string,
): Promise<boolean> {
  const result = await db
    .delete(cannedResponses)
    .where(eq(cannedResponses.id, id))
    .returning({ id: cannedResponses.id });

  return result.length > 0;
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export async function searchCannedResponses(
  db: DbClient,
  input: SearchCannedResponsesInput,
): Promise<CannedResponse[]> {
  const rows = await db
    .select()
    .from(cannedResponses)
    .where(ilike(cannedResponses.title, `%${escapeIlike(input.query)}%`))
    .orderBy(cannedResponses.title)
    .limit(input.limit);

  return rows as CannedResponse[];
}
