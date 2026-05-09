import type { Db } from './db.js';
import type {
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  SearchCannedResponsesInput,
  CannedResponse,
} from '../types/canned-responses.js';

export async function createCannedResponse(
  db: Db,
  input: CreateCannedResponseInput,
): Promise<CannedResponse> {
  return db.cannedResponses.create({
    title: input.title,
    body: input.body,
    bodyHtml: input.bodyHtml ?? null,
    createdBy: input.createdBy,
  });
}

export async function getCannedResponseById(
  db: Db,
  id: string,
): Promise<CannedResponse | undefined> {
  return db.cannedResponses.getById(id);
}

export async function listCannedResponses(
  db: Db,
): Promise<CannedResponse[]> {
  return db.cannedResponses.list();
}

export async function updateCannedResponse(
  db: Db,
  id: string,
  input: UpdateCannedResponseInput,
): Promise<CannedResponse | undefined> {
  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new Error('Canned response title cannot be empty');
  }
  if (input.body !== undefined && input.body.trim().length === 0) {
    throw new Error('Canned response body cannot be empty');
  }

  return db.cannedResponses.update(id, {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.body !== undefined && { body: input.body }),
    ...(input.bodyHtml !== undefined && { bodyHtml: input.bodyHtml ?? null }),
  });
}

export async function deleteCannedResponse(
  db: Db,
  id: string,
): Promise<boolean> {
  return db.cannedResponses.delete(id);
}

export async function searchCannedResponses(
  db: Db,
  input: SearchCannedResponsesInput,
): Promise<CannedResponse[]> {
  return db.cannedResponses.search(input.query, input.limit);
}
