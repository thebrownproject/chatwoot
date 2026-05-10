import type { HookDb } from '../types.js';

export async function onConversationAssigned(
  db: HookDb,
  conversationId: string,
  assigneeId: string,
): Promise<void> {
  try {
    const assignee = await db.getUser(assigneeId);
    if (!assignee) return;

    if (assignee.type === 'ai_agent') {
      await db.createNotification({
        userId: assigneeId,
        conversationId,
        type: 'agent_trigger',
        message: 'AI agent assigned to conversation',
      });
      return;
    }

    await db.createNotification({
      userId: assigneeId,
      conversationId,
      type: 'assigned',
      message: 'You have been assigned a conversation',
    });
  } catch (err) {
    console.error('onConversationAssigned hook failed:', err);
  }
}
