import { z } from 'zod';

export const participantRoles = ['contact', 'assignee', 'observer', 'copilot'] as const;
export type ParticipantRole = (typeof participantRoles)[number];

export const participantRoleSchema = z.enum(participantRoles);

export const addParticipantSchema = z.object({
  userId: z.string().uuid(),
  role: participantRoleSchema,
});
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const updateParticipantRoleSchema = z.object({
  role: participantRoleSchema,
});
export type UpdateParticipantRoleInput = z.infer<typeof updateParticipantRoleSchema>;

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt: Date | null;
};

export type ParticipantWithUser = ConversationParticipant & {
  user: {
    id: string;
    name: string;
    email: string | null;
    type: string;
  };
};
