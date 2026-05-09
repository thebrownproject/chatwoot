import type { Db } from './db.js';
import type {
  CreateLabelInput,
  ConversationLabelInput,
  Label,
  ConversationLabel,
} from '../types/labels.js';

export async function createLabel(
  db: Db,
  input: CreateLabelInput,
): Promise<Label> {
  const trimmed = input.name.trim();
  if (trimmed.length === 0) {
    throw new Error('Label name cannot be empty');
  }

  const existing = await db.labels.findByName(trimmed);
  if (existing) {
    return existing;
  }

  return db.labels.create(trimmed, input.color ?? null);
}

export async function listLabels(db: Db): Promise<Label[]> {
  return db.labels.list();
}

export async function addLabelToConversation(
  db: Db,
  input: ConversationLabelInput,
): Promise<ConversationLabel> {
  return db.labels.addToConversation(input.conversationId, input.labelId);
}

export async function removeLabelFromConversation(
  db: Db,
  input: ConversationLabelInput,
): Promise<void> {
  return db.labels.removeFromConversation(input.conversationId, input.labelId);
}

export async function getConversationLabels(
  db: Db,
  conversationId: string,
): Promise<Label[]> {
  return db.labels.getConversationLabels(conversationId);
}

export async function getConversationsByLabel(
  db: Db,
  labelId: string,
): Promise<string[]> {
  return db.labels.getConversationsByLabel(labelId);
}
