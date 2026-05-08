import { eq, and } from 'drizzle-orm';
import type { DbClient } from '@buildpass/db';
import { labels, conversationLabels } from '@buildpass/db';
import type {
  CreateLabelInput,
  ConversationLabelInput,
  Label,
  ConversationLabel,
} from '../types/labels.js';

export async function createLabel(
  db: DbClient,
  input: CreateLabelInput,
): Promise<Label> {
  const [row] = await db
    .insert(labels)
    .values({
      name: input.name,
      color: input.color ?? null,
    })
    .returning();

  return row as Label;
}

export async function listLabels(db: DbClient): Promise<Label[]> {
  const rows = await db.select().from(labels).orderBy(labels.name);
  return rows as Label[];
}

export async function addLabelToConversation(
  db: DbClient,
  input: ConversationLabelInput,
): Promise<ConversationLabel> {
  const [row] = await db
    .insert(conversationLabels)
    .values({
      conversationId: input.conversationId,
      labelId: input.labelId,
    })
    .onConflictDoNothing()
    .returning();

  return (row ?? input) as ConversationLabel;
}

export async function removeLabelFromConversation(
  db: DbClient,
  input: ConversationLabelInput,
): Promise<void> {
  await db
    .delete(conversationLabels)
    .where(
      and(
        eq(conversationLabels.conversationId, input.conversationId),
        eq(conversationLabels.labelId, input.labelId),
      ),
    );
}

export async function getConversationLabels(
  db: DbClient,
  conversationId: string,
): Promise<Label[]> {
  const rows = await db
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
      createdAt: labels.createdAt,
    })
    .from(conversationLabels)
    .innerJoin(labels, eq(conversationLabels.labelId, labels.id))
    .where(eq(conversationLabels.conversationId, conversationId));

  return rows as Label[];
}

export async function getConversationsByLabel(
  db: DbClient,
  labelId: string,
): Promise<string[]> {
  const rows = await db
    .select({ conversationId: conversationLabels.conversationId })
    .from(conversationLabels)
    .where(eq(conversationLabels.labelId, labelId));

  return rows.map((r) => r.conversationId);
}
