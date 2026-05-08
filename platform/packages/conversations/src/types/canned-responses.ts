import { z } from 'zod';

export const CreateCannedResponseInput = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  bodyHtml: z.string().nullish(),
  createdBy: z.string().uuid(),
});
export type CreateCannedResponseInput = z.infer<typeof CreateCannedResponseInput>;

export const UpdateCannedResponseInput = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
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
