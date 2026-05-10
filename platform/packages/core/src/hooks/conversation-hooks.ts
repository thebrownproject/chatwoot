import type { HookDb, HookConversationEvent } from '../types.js';

export async function onConversationEvent(
  db: HookDb,
  event: HookConversationEvent,
): Promise<void> {
  try {
    switch (event.eventType) {
      case 'assigned': {
        const assigneeId = event.payload['assigneeId'];
        if (typeof assigneeId === 'string' && assigneeId && assigneeId !== event.actorId) {
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
          try {
            await db.createNotification({
              userId: leadId,
              conversationId: event.conversationId,
              type: 'escalated',
              message: 'A conversation has been escalated',
            });
          } catch (err) {
            console.error(`Failed to notify lead ${leadId}:`, err);
          }
        }
        break;
      }

      case 'status_changed': {
        const toStatus = typeof event.payload['to'] === 'string' ? event.payload['to'] : 'unknown';
        const participantIds = await db.getParticipantIds(event.conversationId);
        for (const userId of participantIds) {
          if (userId === event.actorId) continue;
          try {
            await db.createNotification({
              userId,
              conversationId: event.conversationId,
              type: 'status_changed',
              message: `Conversation status changed to ${toStatus}`,
            });
          } catch (err) {
            console.error(`Failed to notify participant ${userId}:`, err);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('onConversationEvent hook failed:', err);
  }
}
