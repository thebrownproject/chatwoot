import { z } from 'zod';

const nonBlank = (s: string) => s.trim().length > 0;

export const CreateCannedResponseInput = z.object({
  title: z.string().min(1).max(200).refine(nonBlank, { message: 'Title cannot be whitespace only' }),
  body: z.string().min(1).refine(nonBlank, { message: 'Body cannot be whitespace only' }),
  bodyHtml: z.string().nullish(),
  createdBy: z.string().uuid(),
});
export type CreateCannedResponseInput = z.infer<typeof CreateCannedResponseInput>;

export const UpdateCannedResponseInput = z.object({
  title: z.string().min(1).max(200).refine(nonBlank, { message: 'Title cannot be whitespace only' }).optional(),
  body: z.string().min(1).refine(nonBlank, { message: 'Body cannot be whitespace only' }).optional(),
  bodyHtml: z.string().nullish(),
});
export type UpdateCannedResponseInput = z.infer<typeof UpdateCannedResponseInput>;

export const SearchCannedResponsesInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type SearchCannedResponsesInput = z.infer<typeof SearchCannedResponsesInput>;

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  bodyHtml: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
