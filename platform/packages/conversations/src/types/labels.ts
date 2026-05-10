import { z } from 'zod';

export const CreateLabelInput = z.object({
  name: z.string().min(1).max(100).refine((s) => s.trim().length > 0, { message: 'Label name cannot be whitespace only' }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
});
export type CreateLabelInput = z.infer<typeof CreateLabelInput>;

export const ConversationLabelInput = z.object({
  conversationId: z.string().uuid(),
  labelId: z.string().uuid(),
});
export type ConversationLabelInput = z.infer<typeof ConversationLabelInput>;

/** @deprecated Use ConversationLabelInput */
export type AddLabelToConversationInput = ConversationLabelInput;
/** @deprecated Use ConversationLabelInput */
export type RemoveLabelFromConversationInput = ConversationLabelInput;

export interface Label {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
}

export interface ConversationLabel {
  conversationId: string;
  labelId: string;
}
