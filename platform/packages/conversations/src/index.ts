// ── PR #7: Core CRUD + Status Machine ──

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
  ConversationEvent as ConversationEventLegacy,
  ConversationParticipant as ConversationParticipantLegacy,
  ConversationStatus,
  ConversationPriority,
  ConversationEventType,
  ChannelOrigin,
  StatusTransition,
  DbClient,
} from './types.js';

// ── PR #8: Assignment, Participants, Events ──

export * as participants from './data/participants.js';
export * as assignment from './data/assignment.js';
export * as events from './data/events.js';

export { participantsRoutes } from './routes/participants.js';
export { assignmentRoutes } from './routes/assignment.js';
export { eventsRoutes } from './routes/events.js';

export type { ParticipantRole, AddParticipantInput, ConversationParticipant, ParticipantWithUser } from './types/participants.js';
export type { AssignConversationInput, AssignedConversationsFilter, ConversationAssignee, AssignedConversation } from './types/assignment.js';
export type { EventType, ConversationEventCreate, ConversationEvent } from './types/events.js';

export type { Db } from './data/db.js';

// ── PR #9: Messages, Labels, Canned Responses ──

export {
  createMessage,
  getMessageById,
  listMessages,
  searchMessages,
} from './data/messages.js';

export {
  createLabel,
  listLabels,
  addLabelToConversation,
  removeLabelFromConversation,
  getConversationLabels,
  getConversationsByLabel,
} from './data/labels.js';

export {
  createCannedResponse,
  getCannedResponseById,
  listCannedResponses,
  updateCannedResponse,
  deleteCannedResponse,
  searchCannedResponses,
} from './data/canned-responses.js';

export { messageRoutes } from './routes/messages.js';
export { labelRoutes } from './routes/labels.js';
export { cannedResponseRoutes } from './routes/canned-responses.js';
export type { RouteEnv } from './routes/shared.js';

export type {
  Message,
  CreateMessageInput,
  ListMessagesInput,
  SearchMessagesInput,
} from './types/messages.js';
export { MessageType, MessageVisibility } from './types/messages.js';

export type {
  Label,
  ConversationLabel,
  CreateLabelInput,
  ConversationLabelInput,
  AddLabelToConversationInput,
  RemoveLabelFromConversationInput,
} from './types/labels.js';

export type {
  CannedResponse,
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  SearchCannedResponsesInput,
} from './types/canned-responses.js';
