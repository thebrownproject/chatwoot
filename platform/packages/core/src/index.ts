export { EventBus, eventBus } from './event-bus.js';
export { generateId, zUuid, zPagination, zSearchQuery, jsonError, isValidUuid, parseUuidParam } from './utils.js';
export { bootstrap, resetBootstrap } from './bootstrap.js';
export { smartErrorHandler } from './error-middleware.js';
export { onMessageCreated } from './hooks/message-hooks.js';
export { onConversationEvent } from './hooks/conversation-hooks.js';
export { onConversationAssigned } from './hooks/assignment-hooks.js';
export type {
  EventMap,
  HookDb,
  HookConversation,
  HookMessage,
  HookUser,
  HookConversationEvent,
  Notification,
} from './types.js';
