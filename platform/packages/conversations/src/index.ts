// Data layer
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

// Routes
export { messageRoutes } from './routes/messages.js';
export { labelRoutes } from './routes/labels.js';
export { cannedResponseRoutes } from './routes/canned-responses.js';
export type { RouteEnv } from './routes/shared.js';

// Types
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
