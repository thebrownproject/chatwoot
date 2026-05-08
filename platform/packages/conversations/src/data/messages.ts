import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbClient } from '@buildpass/db';
import { messages } from '@buildpass/db';
import type { CreateMessageInput, ListMessagesInput, SearchMessagesInput, Message } from '../types/messages.js';

export async function createMessage(
  db: DbClient,
  input: CreateMessageInput,
): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: input.type,
      visibility: input.visibility,
      body: input.body,
      bodyHtml: input.bodyHtml ?? null,
      metadata: input.metadata,
      attachments: input.attachments,
    })
    .returning();

  return row as Message;
}

export async function getMessageById(
  db: DbClient,
  id: string,
): Promise<Message | undefined> {
  const [row] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);

  return row as Message | undefined;
}

export async function listMessages(
  db: DbClient,
  input: ListMessagesInput,
): Promise<Message[]> {
  const conditions = [eq(messages.conversationId, input.conversationId)];

  if (input.visibility) {
    conditions.push(eq(messages.visibility, input.visibility));
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(input.limit)
    .offset(input.offset);

  return rows as Message[];
}

export async function searchMessages(
  db: DbClient,
  input: SearchMessagesInput,
): Promise<Message[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      sql`to_tsvector('english', ${messages.body}) @@ plainto_tsquery('english', ${input.query})`,
    )
    .orderBy(
      sql`ts_rank(to_tsvector('english', ${messages.body}), plainto_tsquery('english', ${input.query})) DESC`,
    )
    .limit(input.limit)
    .offset(input.offset);

  return rows as Message[];
}
