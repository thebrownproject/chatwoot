import { z } from 'zod';

export const eventTypes = [
  'assigned',
  'unassigned',
  'status_changed',
  'participant_joined',
  'participant_left',
  'role_changed',
  'escalated',
  'snoozed',
  'resolved',
  'reopened',
] as const;
export type EventType = (typeof eventTypes)[number];

export const eventTypeSchema = z.enum(eventTypes);

export const createEventSchema = z.object({
  conversationId: z.string().uuid(),
  actorId: z.string().uuid(),
  eventType: eventTypeSchema,
  payload: z.record(z.unknown()).optional().default({}),
});
export type ConversationEventCreate = z.infer<typeof createEventSchema>;

export type ConversationEvent = {
  id: string;
  conversationId: string;
  actorId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  createdAt: Date;
};
