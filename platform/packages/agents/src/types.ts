// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

/** Capabilities an agent can have */
export type AgentCapability =
  | 'respond'
  | 'suggest'
  | 'escalate'
  | 'tool_call'
  | 'triage'
  | 'summarize';

/** Agent configuration stored in User.metadata for ai_agent users */
export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  capabilities: AgentCapability[];
  instructions: string;
  tools: ToolDefinition[];
}

/** Tool definition for an agent */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent context & response
// ---------------------------------------------------------------------------

/** Message shape used within agent context (subset of conversations Message) */
export interface ContextMessage {
  id: string;
  senderId: string;
  senderType: 'human_agent' | 'ai_agent' | 'contact' | 'system';
  body: string;
  visibility: 'public' | 'internal';
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/** Participant shape used within agent context */
export interface ContextParticipant {
  userId: string;
  role: 'contact' | 'assignee' | 'observer' | 'copilot';
}

/** Context passed to the agent handler for decision-making */
export interface AgentContext {
  conversation: {
    id: string;
    displayId: number;
    status: string;
    subject: string | null;
    assigneeId: string | null;
  };
  messages: ContextMessage[];
  participants: ContextParticipant[];
  metadata: Record<string, unknown>;
}

/** Action the agent chose to take */
export type AgentAction = 'respond' | 'suggest' | 'escalate' | 'tool_call';

/** Response returned by the agent handler */
export interface AgentResponse {
  action: AgentAction;
  content: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Copilot
// ---------------------------------------------------------------------------

/** Copilot suggestion status */
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

/** A copilot suggestion (stored as an internal Message with typed metadata) */
export interface CopilotSuggestion {
  id: string;
  conversationId: string;
  agentId: string;
  suggestedReply: string;
  confidence: number;
  reasoning: string;
  status: SuggestionStatus;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Handoff
// ---------------------------------------------------------------------------

/** A handoff request from one participant to another */
export interface HandoffRequest {
  id: string;
  fromAgentId: string;
  toUserId: string | null;
  conversationId: string;
  reason: string;
  contextSummary: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Tool calls
// ---------------------------------------------------------------------------

/** Record of a tool call made by an agent */
export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent handler (injectable)
// ---------------------------------------------------------------------------

/**
 * Injectable handler that performs the actual LLM call.
 * The orchestrator builds context and calls this function.
 * Actual Anthropic SDK integration is wired in separately.
 */
export type AgentHandler = (
  config: AgentConfig,
  context: AgentContext,
) => Promise<AgentResponse>;

// ---------------------------------------------------------------------------
// Data for CRUD
// ---------------------------------------------------------------------------

/** Data required to register a new agent */
export interface AgentConfigCreate {
  name: string;
  model: string;
  capabilities: AgentCapability[];
  instructions: string;
  tools?: ToolDefinition[];
}

/** Data for partially updating an agent config */
export interface AgentConfigUpdate {
  name?: string;
  model?: string;
  capabilities?: AgentCapability[];
  instructions?: string;
  tools?: ToolDefinition[];
}

// ---------------------------------------------------------------------------
// Minimal database interface (matches conversations module pattern)
// ---------------------------------------------------------------------------

/**
 * Minimal database interface expected by data functions.
 * The real implementation comes from @buildpass/db.
 * This stub lets us develop and test without the db package.
 */
export interface DbClient {
  query: unknown;
  execute: (sql: string) => Promise<unknown>;
  [key: string]: unknown;
}
