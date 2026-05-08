import { describe, it, expect, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../orchestrator.js';
import {
  _seedConversation,
  _seedMessages,
  _seedParticipants,
  _getEvents,
  _resetOrchestratorStore,
} from '../orchestrator.js';
import { registerAgent, _resetStore as _resetAgentStore } from '../data/agents.js';
import { _resetCopilotStore, listPendingSuggestions } from '../copilot.js';
import { _resetHandoffStore, _getHandoffEvents } from '../handoff.js';
import type { AgentHandler, DbClient, ContextMessage } from '../types.js';

const db = {} as DbClient;

const testMessage: ContextMessage = {
  id: 'msg-1',
  senderId: 'contact-1',
  senderType: 'contact',
  body: 'I need help with my account',
  visibility: 'public',
  createdAt: new Date(),
};

beforeEach(() => {
  _resetOrchestratorStore();
  _resetAgentStore();
  _resetCopilotStore();
  _resetHandoffStore();
});

async function setupAgent(): Promise<string> {
  const agent = await registerAgent(db, {
    name: 'Ron Swanson',
    model: 'claude-sonnet-4-20250514',
    capabilities: ['respond', 'suggest', 'escalate'],
    instructions: 'You are Ron.',
  });

  _seedConversation({
    id: 'conv-1',
    displayId: 1,
    status: 'open',
    subject: 'Help request',
    assigneeId: agent.id,
    metadata: {},
  });

  _seedMessages('conv-1', [
    {
      id: 'msg-0',
      conversationId: 'conv-1',
      senderId: 'contact-1',
      senderType: 'contact',
      body: 'Hello, I need help',
      visibility: 'public',
      metadata: {},
      createdAt: new Date(),
    },
  ]);

  _seedParticipants('conv-1', [
    { userId: 'contact-1', role: 'contact' },
    { userId: agent.id, role: 'assignee' },
  ]);

  return agent.id;
}

describe('AgentOrchestrator.processMessage', () => {
  it('calls handler and returns response for respond action', async () => {
    const agentId = await setupAgent();

    const handler: AgentHandler = async (_config, _context) => ({
      action: 'respond',
      content: 'I can help you with that.',
    });

    const orchestrator = new AgentOrchestrator(handler);
    const response = await orchestrator.processMessage(db, agentId, 'conv-1', testMessage);

    expect(response.action).toBe('respond');
    expect(response.content).toBe('I can help you with that.');
  });

  it('creates a message event when responding', async () => {
    const agentId = await setupAgent();

    const handler: AgentHandler = async () => ({
      action: 'respond',
      content: 'Response text',
    });

    const orchestrator = new AgentOrchestrator(handler);
    await orchestrator.processMessage(db, agentId, 'conv-1', testMessage);

    const events = _getEvents();
    const agentEvent = events.find((e) => e.eventType === 'agent_responded');
    expect(agentEvent).toBeDefined();
    expect(agentEvent!.actorId).toBe(agentId);
  });

  it('creates a copilot suggestion when suggesting', async () => {
    const agentId = await setupAgent();

    const handler: AgentHandler = async () => ({
      action: 'suggest',
      content: 'Maybe try this reply...',
      metadata: { confidence: 0.85, reasoning: 'Based on KB article' },
    });

    const orchestrator = new AgentOrchestrator(handler);
    await orchestrator.processMessage(db, agentId, 'conv-1', testMessage);

    const suggestions = await listPendingSuggestions(db, 'conv-1');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.suggestedReply).toBe('Maybe try this reply...');
    expect(suggestions[0]!.confidence).toBe(0.85);
  });

  it('triggers handoff when escalating', async () => {
    const agentId = await setupAgent();

    const handler: AgentHandler = async () => ({
      action: 'escalate',
      content: 'Customer needs human help',
    });

    const orchestrator = new AgentOrchestrator(handler);
    await orchestrator.processMessage(db, agentId, 'conv-1', testMessage);

    const events = _getHandoffEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('escalated');
  });

  it('records tool call event', async () => {
    const agentId = await setupAgent();

    const handler: AgentHandler = async () => ({
      action: 'tool_call',
      content: 'Searched KB for account help',
      metadata: { toolName: 'kb_search' },
    });

    const orchestrator = new AgentOrchestrator(handler);
    await orchestrator.processMessage(db, agentId, 'conv-1', testMessage);

    const events = _getEvents();
    const toolEvent = events.find((e) => e.eventType === 'agent_tool_call');
    expect(toolEvent).toBeDefined();
    expect(toolEvent!.payload['toolName']).toBe('kb_search');
  });

  it('throws if agent not found', async () => {
    const handler: AgentHandler = async () => ({
      action: 'respond',
      content: 'test',
    });

    const orchestrator = new AgentOrchestrator(handler);
    await expect(
      orchestrator.processMessage(db, 'nonexistent', 'conv-1', testMessage),
    ).rejects.toThrow('Agent not found');
  });
});

describe('AgentOrchestrator.buildContext', () => {
  it('builds context with conversation, messages, and participants', async () => {
    await setupAgent();

    const handler: AgentHandler = async () => ({
      action: 'respond',
      content: 'test',
    });

    const orchestrator = new AgentOrchestrator(handler);
    const context = await orchestrator.buildContext(db, 'conv-1');

    expect(context.conversation.id).toBe('conv-1');
    expect(context.conversation.displayId).toBe(1);
    expect(context.conversation.subject).toBe('Help request');
    expect(context.messages).toHaveLength(1);
    expect(context.messages[0]!.body).toBe('Hello, I need help');
    expect(context.participants).toHaveLength(2);
  });

  it('throws if conversation not found', async () => {
    const handler: AgentHandler = async () => ({
      action: 'respond',
      content: 'test',
    });

    const orchestrator = new AgentOrchestrator(handler);
    await expect(orchestrator.buildContext(db, 'nonexistent')).rejects.toThrow(
      'Conversation not found',
    );
  });
});
