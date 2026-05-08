import { z } from 'zod';

export const MessageType = z.enum(['text', 'rich', 'activity']);
export type MessageType = z.infer<typeof MessageType>;

export const MessageVisibility = z.enum(['public', 'internal']);
export type MessageVisibility = z.infer<typeof MessageVisibility>;

export const CreateMessageInput = z.object({
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  type: MessageType.default('text'),
  visibility: MessageVisibility.default('public'),
  body: z.string().min(1),
  bodyHtml: z.string().nullish(),
  metadata: z.record(z.unknown()).default({}),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number().int().positive(),
  })).default([]),
});
export type CreateMessageInput = z.infer<typeof CreateMessageInput>;

export const ListMessagesInput = z.object({
  conversationId: z.string().uuid(),
  visibility: MessageVisibility.optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});
export type ListMessagesInput = z.infer<typeof ListMessagesInput>;

export const SearchMessagesInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});
export type SearchMessagesInput = z.infer<typeof SearchMessagesInput>;

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  visibility: MessageVisibility;
  body: string;
  bodyHtml: string | null;
  metadata: Record<string, unknown>;
  attachments: Array<{
    url: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
