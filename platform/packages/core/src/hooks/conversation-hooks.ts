import type { HookDb, HookConversationEvent } from '../types.js';

/**
 * Hook: runs after a conversation event is recorded.
 *
 * 1. Dispatch notifications based on event type:
 *    - assigned -> notify new assignee
 *    - escalated -> notify team leads
 *    - status_changed -> notify participants
 * 2. If agent assigned as owner -> trigger agent orchestrator (via event bus re-emit).
 */
export async function onConversationEvent(
  db: HookDb,
  event: HookConversationEvent,
): Promise<void> {
  switch (event.eventType) {
    case 'assigned': {
      const assigneeId = event.payload['assigneeId'] as string | undefined;
      if (assigneeId && assigneeId !== event.actorId) {
        await db.createNotification({
          userId: assigneeId,
          conversationId: event.conversationId,
          type: 'assigned',
          message: 'You have been assigned a conversation',
        });
      }
      break;
    }

    case 'escalated': {
      const leadIds = await db.getTeamLeadIds();
      for (const leadId of leadIds) {
        await db.createNotification({
          userId: leadId,
          conversationId: event.conversationId,
          type: 'escalated',
          message: 'A conversation has been escalated',
        });
      }
      break;
    }

    case 'status_changed': {
      const participantIds = await db.getParticipantIds(event.conversationId);
      for (const userId of participantIds) {
        if (userId === event.actorId) continue;
        await db.createNotification({
          userId,
          conversationId: event.conversationId,
          type: 'status_changed',
          message: `Conversation status changed to ${event.payload['to'] as string}`,
        });
      }
      break;
    }

    default:
      break;
  }
}
