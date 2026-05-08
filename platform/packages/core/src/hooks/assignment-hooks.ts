import type { HookDb } from '../types.js';

/**
 * Hook: runs after a conversation is assigned.
 *
 * 1. If assignee is ai_agent -> trigger agent processing (stub for Phase 2).
 * 2. Create notification for new assignee.
 */
export async function onConversationAssigned(
  db: HookDb,
  conversationId: string,
  assigneeId: string,
): Promise<void> {
  const assignee = await db.getUser(assigneeId);
  if (!assignee) return;

  // 1. If AI agent, trigger agent orchestrator (Phase 2 stub)
  if (assignee.type === 'ai_agent') {
    // In Phase 2 this calls into the agents module:
    // await agentOrchestrator.processConversation(conversationId, assigneeId);
    // For now, create an internal notification so the event is observable.
    await db.createNotification({
      userId: assigneeId,
      conversationId,
      type: 'agent_trigger',
      message: 'AI agent assigned to conversation',
    });
    return;
  }

  // 2. Notify human assignee
  await db.createNotification({
    userId: assigneeId,
    conversationId,
    type: 'assigned',
    message: 'You have been assigned a conversation',
  });
}
