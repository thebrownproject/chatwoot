import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestHandoff,
  handoffToAgent,
  handoffAgentToAgent,
  _resetHandoffStore,
  _getHandoffEvents,
  _getHandoffs,
  _seedAssignment,
} from '../handoff.js';
import type { DbClient } from '../types.js';

const db = {} as DbClient;

beforeEach(() => {
  _resetHandoffStore();
});

describe('requestHandoff (agent -> human)', () => {
  it('creates a handoff request with reason and summary', async () => {
    const handoff = await requestHandoff(
      db,
      'agent-ron',
      'conv-1',
      'Customer needs billing specialist',
    );

    expect(handoff.id).toBeDefined();
    expect(handoff.fromAgentId).toBe('agent-ron');
    expect(handoff.conversationId).toBe('conv-1');
    expect(handoff.reason).toBe('Customer needs billing specialist');
    expect(handoff.toUserId).toBeNull();
    expect(handoff.contextSummary).toContain('agent-ron');
    expect(handoff.contextSummary).toContain('billing specialist');
  });

  it('assigns to specific human when toUserId provided', async () => {
    const handoff = await requestHandoff(
      db,
      'agent-ron',
      'conv-1',
      'Needs human',
      'human-joanna',
    );

    expect(handoff.toUserId).toBe('human-joanna');
  });

  it('creates an escalated event', async () => {
    await requestHandoff(db, 'agent-ron', 'conv-1', 'Complex issue');

    const events = _getHandoffEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('escalated');
    expect(events[0]!.actorId).toBe('agent-ron');
    expect(events[0]!.payload['reason']).toBe('Complex issue');
  });

  it('unassigns conversation when no target specified', async () => {
    _seedAssignment('conv-1', 'agent-ron');

    await requestHandoff(db, 'agent-ron', 'conv-1', 'Need help');

    // After handoff with no target, conversation goes to queue (null assignee)
    const events = _getHandoffEvents();
    expect(events[0]!.payload['toUserId']).toBeNull();
  });
});

describe('handoffToAgent (human -> agent)', () => {
  it('assigns agent and creates event', async () => {
    _seedAssignment('conv-1', 'human-1');

    await handoffToAgent(db, 'conv-1', 'agent-ron', 'human-1');

    const events = _getHandoffEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('assigned');
    expect(events[0]!.payload['direction']).toBe('human_to_agent');
    expect(events[0]!.payload['toAgentId']).toBe('agent-ron');
    expect(events[0]!.payload['fromUserId']).toBe('human-1');
  });
});

describe('handoffAgentToAgent (agent -> agent)', () => {
  it('creates handoff record and reassigns', async () => {
    _seedAssignment('conv-1', 'agent-triage');

    const handoff = await handoffAgentToAgent(
      db,
      'conv-1',
      'agent-triage',
      'agent-specialist',
      'Needs billing expertise',
    );

    expect(handoff.fromAgentId).toBe('agent-triage');
    expect(handoff.toUserId).toBe('agent-specialist');
    expect(handoff.reason).toBe('Needs billing expertise');
  });

  it('creates an assigned event with agent_to_agent direction', async () => {
    await handoffAgentToAgent(
      db,
      'conv-1',
      'agent-triage',
      'agent-specialist',
      'Routing to specialist',
    );

    const events = _getHandoffEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('assigned');
    expect(events[0]!.payload['direction']).toBe('agent_to_agent');
    expect(events[0]!.payload['fromAgentId']).toBe('agent-triage');
    expect(events[0]!.payload['toAgentId']).toBe('agent-specialist');
  });

  it('records the handoff for audit', async () => {
    await handoffAgentToAgent(
      db,
      'conv-1',
      'agent-a',
      'agent-b',
      'Specialist needed',
    );

    const handoffs = _getHandoffs();
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0]!.contextSummary).toContain('agent-a');
    expect(handoffs[0]!.contextSummary).toContain('agent-b');
  });
});

describe('full handoff lifecycle', () => {
  it('agent -> human -> agent (escalation and re-delegation)', async () => {
    // 1. Agent escalates to human
    const handoff = await requestHandoff(
      db,
      'agent-ron',
      'conv-1',
      'Customer is upset',
      'human-joanna',
    );
    expect(handoff.toUserId).toBe('human-joanna');

    // 2. Human resolves part of the issue, hands back to agent
    await handoffToAgent(db, 'conv-1', 'agent-ron', 'human-joanna');

    const events = _getHandoffEvents();
    expect(events).toHaveLength(2);
    expect(events[0]!.eventType).toBe('escalated');
    expect(events[1]!.eventType).toBe('assigned');
  });

  it('agent -> agent -> human (triage chain)', async () => {
    // 1. Triage agent routes to specialist
    await handoffAgentToAgent(
      db,
      'conv-1',
      'agent-triage',
      'agent-billing',
      'Billing question',
    );

    // 2. Specialist escalates to human
    await requestHandoff(
      db,
      'agent-billing',
      'conv-1',
      'Need manager approval',
      'human-manager',
    );

    const events = _getHandoffEvents();
    expect(events).toHaveLength(2);
    expect(events[0]!.payload['direction']).toBe('agent_to_agent');
    expect(events[1]!.eventType).toBe('escalated');
  });
});

describe('self-handoff prevention', () => {
  it('requestHandoff rejects handoff to self', async () => {
    await expect(
      requestHandoff(db, 'agent-ron', 'conv-1', 'confused', 'agent-ron'),
    ).rejects.toThrow('Cannot hand off to self');
  });

  it('handoffAgentToAgent rejects handoff to self', async () => {
    await expect(
      handoffAgentToAgent(db, 'conv-1', 'agent-ron', 'agent-ron', 'loop'),
    ).rejects.toThrow('Cannot hand off to self');
  });
});
