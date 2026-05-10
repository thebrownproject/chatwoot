/**
 * E2E: Agent copilot
 *
 * Ron as copilot: suggestion -> accept/dismiss -> escalation -> handoff
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Agent copilot', () => {
  it('creates a suggestion, accepts it', async () => {
    const agent = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });

    // Create conversation for context
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Permit requirements',
    });

    // Agent generates a copilot suggestion
    const suggestion = await p.agents.copilot.createSuggestion(p.db, {
      conversationId: conv.id,
      agentId: agent.id,
      suggestedReply: 'You need a Class 1A permit for residential work.',
      confidence: 0.92,
      reasoning: 'Matched against construction permit database',
    });

    expect(suggestion.status).toBe('pending');
    expect(suggestion.confidence).toBe(0.92);
    expect(suggestion.conversationId).toBe(conv.id);

    // List pending suggestions
    const pending = await p.agents.copilot.listPending(p.db, conv.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe(suggestion.id);

    // Human accepts the suggestion
    const accepted = await p.agents.copilot.accept(p.db, suggestion.id);
    expect(accepted?.status).toBe('accepted');

    // Pending list is now empty
    const afterAccept = await p.agents.copilot.listPending(p.db, conv.id);
    expect(afterAccept).toHaveLength(0);
  });

  it('creates a suggestion, accepts it with edits', async () => {
    const agent = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Inspection scheduling',
    });

    const suggestion = await p.agents.copilot.createSuggestion(p.db, {
      conversationId: conv.id,
      agentId: agent.id,
      suggestedReply: 'Inspections are available Monday to Friday.',
      confidence: 0.85,
      reasoning: 'Standard scheduling info',
    });

    // Human accepts with edits
    const edited = await p.agents.copilot.accept(
      p.db,
      suggestion.id,
      'Inspections are available Monday to Friday, 8am-4pm AEST.',
    );

    expect(edited?.status).toBe('accepted');
    expect(edited?.suggestedReply).toBe(
      'Inspections are available Monday to Friday, 8am-4pm AEST.',
    );
  });

  it('creates a suggestion, dismisses it', async () => {
    const agent = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Wrong answer expected',
    });

    const suggestion = await p.agents.copilot.createSuggestion(p.db, {
      conversationId: conv.id,
      agentId: agent.id,
      suggestedReply: 'This is incorrect advice.',
      confidence: 0.3,
      reasoning: 'Low confidence match',
    });

    // Human dismisses the suggestion
    const dismissed = await p.agents.copilot.dismiss(p.db, suggestion.id);
    expect(dismissed?.status).toBe('dismissed');

    // Cannot accept a dismissed suggestion
    const attemptAccept = await p.agents.copilot.accept(p.db, suggestion.id);
    expect(attemptAccept).toBeUndefined();
  });

  it('cannot accept or dismiss the same suggestion twice', async () => {
    const agent = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
    });

    const suggestion = await p.agents.copilot.createSuggestion(p.db, {
      conversationId: conv.id,
      agentId: agent.id,
      suggestedReply: 'Test',
      confidence: 0.5,
      reasoning: 'Test',
    });

    // Accept first time
    await p.agents.copilot.accept(p.db, suggestion.id);

    // Try to dismiss after accepted -> should return undefined
    const result = await p.agents.copilot.dismiss(p.db, suggestion.id);
    expect(result).toBeUndefined();
  });

  it('handles agent escalation via handoff', async () => {
    const ron = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const human = p.users.create({ type: 'human_agent', name: 'Joanna' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Complex legal question',
    });

    // Seed assignment so handoff can track it
    p.agents.handoff.seedAssignment(conv.id, ron.id);

    // Ron escalates to a human
    const handoff = await p.agents.handoff.requestHandoff(
      p.db,
      ron.id,
      conv.id,
      'Customer asking about legal compliance - outside my expertise',
      human.id,
    );

    expect(handoff.fromAgentId).toBe(ron.id);
    expect(handoff.toUserId).toBe(human.id);
    expect(handoff.reason).toContain('legal compliance');
    expect(handoff.contextSummary).toBeTruthy();

    // Verify escalation event was recorded
    const events = p.agents.handoff.getEvents();
    const escalationEvent = events.find((e) => e.eventType === 'escalated');
    expect(escalationEvent).toBeDefined();
    expect(escalationEvent!.conversationId).toBe(conv.id);
  });

  it('handles human -> agent handoff', async () => {
    const human = p.users.create({ type: 'human_agent', name: 'Joanna' });
    const ron = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'email',
      subject: 'Routine question',
    });

    // Human hands off to Ron
    await p.agents.handoff.toAgent(p.db, conv.id, ron.id, human.id);

    // Verify assignment event
    const events = p.agents.handoff.getEvents();
    const assignEvent = events.find(
      (e) => e.eventType === 'assigned' && (e.payload as { direction?: string }).direction === 'human_to_agent',
    );
    expect(assignEvent).toBeDefined();
    expect((assignEvent!.payload as { toAgentId: string }).toAgentId).toBe(ron.id);
  });

  it('handles agent -> agent handoff', async () => {
    const triage = p.users.create({ type: 'ai_agent', name: 'Triage Bot' });
    const specialist = p.users.create({ type: 'ai_agent', name: 'Permit Specialist' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
      subject: 'Permit type question',
    });

    const handoff = await p.agents.handoff.agentToAgent(
      p.db,
      conv.id,
      triage.id,
      specialist.id,
      'Needs permit expertise',
    );

    expect(handoff.fromAgentId).toBe(triage.id);
    expect(handoff.toUserId).toBe(specialist.id);

    // Verify handoff record
    const handoffs = p.agents.handoff.getHandoffs();
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0]!.conversationId).toBe(conv.id);
  });

  describe('Agent registration and config', () => {
    it('registers an agent and retrieves config', async () => {
      const config = await p.agents.register(p.db, {
        name: 'Ron Swanson',
        model: 'claude-sonnet-4-20250514',
        capabilities: ['respond', 'suggest', 'escalate'],
        instructions: 'You are a construction compliance expert.',
        tools: [{ name: 'lookup_permit', description: 'Look up permit info' }],
      });

      expect(config.name).toBe('Ron Swanson');
      expect(config.capabilities).toContain('respond');
      expect(config.tools).toHaveLength(1);

      const fetched = await p.agents.getConfig(p.db, config.id);
      expect(fetched?.name).toBe('Ron Swanson');
      expect(fetched?.model).toBe('claude-sonnet-4-20250514');
    });

    it('lists all registered agents', async () => {
      await p.agents.register(p.db, {
        name: 'Agent A',
        model: 'test',
        capabilities: ['respond'],
        instructions: 'test',
      });
      await p.agents.register(p.db, {
        name: 'Agent B',
        model: 'test',
        capabilities: ['suggest'],
        instructions: 'test',
      });

      const all = await p.agents.list(p.db);
      expect(all).toHaveLength(2);
    });

    it('updates agent config', async () => {
      const config = await p.agents.register(p.db, {
        name: 'Ron',
        model: 'v1',
        capabilities: ['respond'],
        instructions: 'original',
      });

      const updated = await p.agents.updateConfig(p.db, config.id, {
        model: 'v2',
        instructions: 'updated instructions',
        capabilities: ['respond', 'escalate'],
      });

      expect(updated?.model).toBe('v2');
      expect(updated?.instructions).toBe('updated instructions');
      expect(updated?.capabilities).toContain('escalate');
    });

    it('returns undefined when updating non-existent agent', async () => {
      const result = await p.agents.updateConfig(p.db, 'non-existent', {
        name: 'test',
      });
      expect(result).toBeUndefined();
    });
  });

  it('generates a suggestion via the generate helper', async () => {
    const agent = p.users.create({ type: 'ai_agent', name: 'Ron Swanson' });
    const conv = await p.conversations.create(p.db, {
      channelOrigin: 'web_chat',
    });

    const suggestion = await p.agents.copilot.generateSuggestion(p.db, agent.id, conv.id);
    expect(suggestion.agentId).toBe(agent.id);
    expect(suggestion.conversationId).toBe(conv.id);
    expect(suggestion.status).toBe('pending');
  });
});
