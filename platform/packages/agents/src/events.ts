// ---------------------------------------------------------------------------
// Agent-specific realtime event types
// ---------------------------------------------------------------------------

/** Agent is processing a message (typing indicator equivalent) */
export interface AgentThinkingEvent {
  type: 'agent.thinking';
  payload: {
    agentId: string;
    conversationId: string;
  };
}

/** Copilot suggestion ready for human review */
export interface AgentSuggestionEvent {
  type: 'agent.suggestion';
  payload: {
    agentId: string;
    conversationId: string;
    suggestionId: string;
    confidence: number;
  };
}

/** Agent requesting human takeover */
export interface AgentHandoffEvent {
  type: 'agent.handoff';
  payload: {
    agentId: string;
    conversationId: string;
    reason: string;
    toUserId: string | null;
  };
}

/** Agent executing a tool (visible to internal observers) */
export interface AgentToolCallEvent {
  type: 'agent.tool_call';
  payload: {
    agentId: string;
    conversationId: string;
    toolName: string;
    status: 'started' | 'completed' | 'failed';
  };
}

/** Agent confidence level (routing can auto-escalate below threshold) */
export interface AgentConfidenceEvent {
  type: 'agent.confidence';
  payload: {
    agentId: string;
    conversationId: string;
    confidence: number;
  };
}

/** Union of all agent event types */
export type AgentEvent =
  | AgentThinkingEvent
  | AgentSuggestionEvent
  | AgentHandoffEvent
  | AgentToolCallEvent
  | AgentConfidenceEvent;

/** All valid agent event type strings */
export type AgentEventType = AgentEvent['type'];
