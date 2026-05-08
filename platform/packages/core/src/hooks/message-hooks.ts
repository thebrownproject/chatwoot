import type { HookDb, HookMessage, HookConversation } from '../types.js';

/**
 * Hook: runs after a message is created.
 *
 * 1. If conversation is resolved and sender is a contact -> reopen.
 * 2. If this is the first agent reply -> set first_reply_at.
 * 3. Dispatch notification to assignee + participants (except sender).
 */
export async function onMessageCreated(
  db: HookDb,
  message: HookMessage,
  conversation: HookConversation,
): Promise<void> {
  const sender = await db.getUser(message.senderId);
  if (!sender) return;

  // 1. Auto-reopen resolved conversation on new contact message
  if (conversation.status === 'resolved' && sender.type === 'contact') {
    await db.updateConversationStatus(conversation.id, 'open');
  }

  // 2. Set first_reply_at on first agent reply (public messages only)
  if (
    conversation.firstReplyAt === null &&
    (sender.type === 'human_agent' || sender.type === 'ai_agent') &&
    message.visibility === 'public'
  ) {
    await db.setFirstReplyAt(conversation.id, new Date());
  }

  // 3. Notify participants (except sender)
  const participantIds = await db.getParticipantIds(conversation.id);
  const recipients = new Set(participantIds);

  // Include assignee if set
  if (conversation.assigneeId) {
    recipients.add(conversation.assigneeId);
  }

  // Exclude the sender
  recipients.delete(message.senderId);

  for (const userId of recipients) {
    await db.createNotification({
      userId,
      conversationId: conversation.id,
      type: 'new_message',
      message: `New message in conversation`,
    });
  }
}
