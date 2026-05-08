import type {
  AgentConfig,
  AgentContext,
  AgentHandler,
  AgentResponse,
  ContextMessage,
  ContextParticipant,
  CopilotSuggestion,
  DbClient,
  HandoffRequest,
} from './types.js';
import { getAgentConfig } from './data/agents.js';
import { createSuggestion } from './copilot.js';
import { requestHandoff } from './handoff.js';

// ---------------------------------------------------------------------------
// In-memory stores for messages and conversations (stubs for dev/test)
// ---------------------------------------------------------------------------

interface ConversationRecord {
  id: string;
  displayId: number;
  status: string;
  subject: string | null;
  assigneeId: string | null;
  metadata: Record<string, unknown>;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'human_agent' | 'ai_agent' | 'contact' | 'system';
  body: string;
  visibility: 'public' | 'internal';
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface ParticipantRecord {
  userId: string;
  role: 'contact' | 'assignee' | 'observer' | 'copilot';
}

const conversations = new Map<string, ConversationRecord>();
const messages = new Map<string, MessageRecord[]>();
const participants = new Map<string, ParticipantRecord[]>();
const events: Array<{
  conversationId: string;
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
}> = [];

/** Seed a conversation for testing. */
export function _seedConversation(conv: ConversationRecord): void {
  conversations.set(conv.id, conv);
}

/** Seed messages for testing. */
export function _seedMessages(conversationId: string, msgs: MessageRecord[]): void {
  messages.set(conversationId, msgs);
}

/** Seed participants for testing. */
export function _seedParticipants(conversationId: string, parts: ParticipantRecord[]): void {
  participants.set(conversationId, parts);
}

/** Get all recorded events (for test assertions). */
export function _getEvents(): typeof events {
  return events;
}

/** Reset all orchestrator state (for tests only). */
export function _resetOrchestratorStore(): void {
  conversations.clear();
  messages.clear();
  participants.clear();
  events.length = 0;
}

// ---------------------------------------------------------------------------
// AgentOrchestrator
// ---------------------------------------------------------------------------

export class AgentOrchestrator {
  private handler: AgentHandler;

  constructor(handler: AgentHandler) {
    this.handler = handler;
  }

  /**
   * Main entry point. Load agent config, build context, decide action.
   */
  async processMessage(
    db: DbClient,
    agentId: string,
    conversationId: string,
    _message: ContextMessage,
  ): Promise<AgentResponse> {
    const config = await getAgentConfig(db, agentId);
    if (!config) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const context = await this.buildContext(db, conversationId);
    const response = await this.handler(config, context);

    await this.executeResponse(db, agentId, conversationId, response);

    return response;
  }

  /**
   * Gather conversation history, participants, metadata for the agent.
   */
  async buildContext(
    _db: DbClient,
    conversationId: string,
  ): Promise<AgentContext> {
    const conv = conversations.get(conversationId);
    if (!conv) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const convMessages = (messages.get(conversationId) ?? []).map(
      (m): ContextMessage => ({
        id: m.id,
        senderId: m.senderId,
        senderType: m.senderType,
        body: m.body,
        visibility: m.visibility,
        createdAt: m.createdAt,
        metadata: m.metadata,
      }),
    );

    const convParticipants = (participants.get(conversationId) ?? []).map(
      (p): ContextParticipant => ({
        userId: p.userId,
        role: p.role,
      }),
    );

    return {
      conversation: {
        id: conv.id,
        displayId: conv.displayId,
        status: conv.status,
        subject: conv.subject,
        assigneeId: conv.assigneeId,
      },
      messages: convMessages,
      participants: convParticipants,
      metadata: conv.metadata,
    };
  }

  /**
   * Execute the agent's chosen action:
   * - respond: create a public message from the agent
   * - suggest: create an internal copilot suggestion
   * - escalate: trigger handoff protocol
   * - tool_call: record tool execution (placeholder)
   */
  async executeResponse(
    db: DbClient,
    agentId: string,
    conversationId: string,
    response: AgentResponse,
  ): Promise<void> {
    switch (response.action) {
      case 'respond': {
        await this.createAgentMessage(db, agentId, conversationId, response);
        break;
      }
      case 'suggest': {
        await createSuggestion(db, {
          conversationId,
          agentId,
          suggestedReply: response.content,
          confidence: (response.metadata?.['confidence'] as number) ?? 0.5,
          reasoning: (response.metadata?.['reasoning'] as string) ?? '',
        });
        break;
      }
      case 'escalate': {
        await requestHandoff(
          db,
          agentId,
          conversationId,
          response.content,
        );
        break;
      }
      case 'tool_call': {
        await this.recordToolCall(db, agentId, conversationId, response);
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async createAgentMessage(
    _db: DbClient,
    agentId: string,
    conversationId: string,
    response: AgentResponse,
  ): Promise<void> {
    const msg: MessageRecord = {
      id: crypto.randomUUID(),
      conversationId,
      senderId: agentId,
      senderType: 'ai_agent',
      body: response.content,
      visibility: 'public',
      metadata: response.metadata ?? {},
      createdAt: new Date(),
    };

    const existing = messages.get(conversationId) ?? [];
    existing.push(msg);
    messages.set(conversationId, existing);

    events.push({
      conversationId,
      actorId: agentId,
      eventType: 'agent_responded',
      payload: { messageId: msg.id },
    });
  }

  private async recordToolCall(
    _db: DbClient,
    agentId: string,
    conversationId: string,
    response: AgentResponse,
  ): Promise<void> {
    events.push({
      conversationId,
      actorId: agentId,
      eventType: 'agent_tool_call',
      payload: {
        toolName: response.metadata?.['toolName'] ?? 'unknown',
        content: response.content,
      },
    });
  }
}
