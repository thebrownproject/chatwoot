import type { HookDb, HookMessage, HookConversation } from '../types.js';

export async function onMessageCreated(
  db: HookDb,
  message: HookMessage,
  conversation: HookConversation,
): Promise<void> {
  const sender = await db.getUser(message.senderId);
  if (!sender) return;

  try {
    if (conversation.status === 'resolved' && sender.type === 'contact') {
      await db.updateConversationStatus(conversation.id, 'open');
    }
  } catch (err) {
    console.error('Failed to reopen conversation:', err);
  }

  try {
    if (
      conversation.firstReplyAt === null &&
      (sender.type === 'human_agent' || sender.type === 'ai_agent') &&
      message.visibility === 'public'
    ) {
      await db.setFirstReplyAt(conversation.id, new Date());
    }
  } catch (err) {
    console.error('Failed to set first_reply_at:', err);
  }

  try {
    const participantIds = await db.getParticipantIds(conversation.id);
    const recipients = new Set(participantIds);
    if (conversation.assigneeId) {
      recipients.add(conversation.assigneeId);
    }
    recipients.delete(message.senderId);

    for (const userId of recipients) {
      try {
        await db.createNotification({
          userId,
          conversationId: conversation.id,
          type: 'new_message',
          message: 'New message in conversation',
        });
      } catch (err) {
        console.error(`Failed to notify ${userId}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to dispatch notifications:', err);
  }
}
