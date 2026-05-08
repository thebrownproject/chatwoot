import type { HookDb } from './types.js';
import { eventBus } from './event-bus.js';
import { onMessageCreated } from './hooks/message-hooks.js';
import { onConversationEvent } from './hooks/conversation-hooks.js';
import { onConversationAssigned } from './hooks/assignment-hooks.js';

/**
 * Wire all cross-module event handlers. Call once on app startup.
 */
export function bootstrap(db: HookDb): void {
  eventBus.on('message.created', (data) =>
    onMessageCreated(db, data.message, data.conversation),
  );

  eventBus.on('conversation.event', (data) =>
    onConversationEvent(db, data.event),
  );

  eventBus.on('conversation.assigned', (data) =>
    onConversationAssigned(db, data.conversationId, data.assigneeId),
  );
}
