// Data layer
export {
  createConversation,
  getConversationById,
  getConversationByDisplayId,
  listConversations,
  updateConversation,
  resolveConversation,
  reopenConversation,
  snoozeConversation,
  unsnoozeConversation,
  getConversationEvents,
} from './data/conversations.js';

// Status machine
export {
  validateTransition,
  allowedTransitions,
  transitionConversation,
} from './data/status-machine.js';

// Routes
export { conversationRoutes } from './routes/conversations.js';

// Manifest
export { manifest } from './manifest.js';

// Types
export type {
  Conversation,
  ConversationCreate,
  ConversationUpdate,
  ConversationFilters,
  ConversationEvent,
  ConversationParticipant,
  ConversationStatus,
  ConversationPriority,
  ConversationEventType,
  ChannelOrigin,
  ParticipantRole,
  StatusTransition,
  DbClient,
} from './types.js';
