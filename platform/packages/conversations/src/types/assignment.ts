import { z } from 'zod';

export const assignConversationSchema = z.object({
  assigneeId: z.string().uuid(),
});
export type AssignConversationInput = z.infer<typeof assignConversationSchema>;

export const assignedConversationsFilterSchema = z.object({
  status: z.enum(['open', 'pending', 'snoozed', 'resolved']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});
export type AssignedConversationsFilter = z.infer<typeof assignedConversationsFilterSchema>;

export type ConversationAssignee = {
  id: string;
  name: string;
  email: string | null;
  type: string;
};

export type AssignedConversation = {
  id: string;
  displayId: number;
  status: string;
  priority: string | null;
  subject: string | null;
  assigneeId: string;
  createdAt: Date;
  updatedAt: Date;
};
