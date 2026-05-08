// Orchestrator
export { AgentOrchestrator } from './orchestrator.js';

// Copilot
export {
  createSuggestion,
  generateSuggestion,
  acceptSuggestion,
  dismissSuggestion,
  listPendingSuggestions,
} from './copilot.js';

// Handoff
export {
  requestHandoff,
  handoffToAgent,
  handoffAgentToAgent,
} from './handoff.js';

// Agent data (CRUD)
export {
  registerAgent,
  getAgentConfig,
  listAgents,
  updateAgentConfig,
} from './data/agents.js';

// Events
export type {
  AgentEvent,
  AgentEventType,
  AgentThinkingEvent,
  AgentSuggestionEvent,
  AgentHandoffEvent,
  AgentToolCallEvent,
  AgentConfidenceEvent,
} from './events.js';

// Routes
export { agentRoutes } from './routes/agents.js';
export { copilotRoutes } from './routes/copilot.js';
export { handoffRoutes } from './routes/handoff.js';

// Manifest
export { manifest } from './manifest.js';

// Types
export type {
  AgentConfig,
  AgentConfigCreate,
  AgentConfigUpdate,
  AgentCapability,
  AgentContext,
  AgentResponse,
  AgentAction,
  AgentHandler,
  CopilotSuggestion,
  SuggestionStatus,
  HandoffRequest,
  ToolCall,
  ToolDefinition,
  ContextMessage,
  ContextParticipant,
  DbClient,
} from './types.js';
