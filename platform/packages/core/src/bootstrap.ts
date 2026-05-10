import type { HookDb } from './types.js';
import { eventBus } from './event-bus.js';
import { onMessageCreated } from './hooks/message-hooks.js';
import { onConversationEvent } from './hooks/conversation-hooks.js';
import { onConversationAssigned } from './hooks/assignment-hooks.js';

let bootstrapped = false;

export function bootstrap(db: HookDb): void {
  if (bootstrapped) {
    throw new Error('bootstrap() called more than once — hooks already registered');
  }
  bootstrapped = true;

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

export function resetBootstrap(): void {
  bootstrapped = false;
  eventBus.clear();
}
