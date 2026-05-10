import type { Db } from './db.js';
import type { CreateMessageInput, ListMessagesInput, SearchMessagesInput, Message } from '../types/messages.js';

export async function createMessage(
  db: Db,
  input: CreateMessageInput,
): Promise<Message> {
  if (!input.body.trim()) {
    throw new Error('Message body cannot be empty or whitespace-only');
  }
  return db.messages.create(input);
}

export async function getMessageById(
  db: Db,
  id: string,
): Promise<Message | undefined> {
  return db.messages.getById(id);
}

export async function listMessages(
  db: Db,
  input: ListMessagesInput,
): Promise<Message[]> {
  return db.messages.list(input);
}

export async function searchMessages(
  db: Db,
  input: SearchMessagesInput,
): Promise<Message[]> {
  if (!input.query.trim()) {
    return [];
  }
  return db.messages.search(input);
}
