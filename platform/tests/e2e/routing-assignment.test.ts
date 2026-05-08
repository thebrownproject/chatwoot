/**
 * E2E: Routing and assignment
 *
 * Tests team creation, round-robin assignment, priority routing rules,
 * manual reassignment, and unassigned conversation queries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

describe('Routing & Assignment', () => {
  let p: Platform;

  beforeEach(() => {
    p = createPlatform();
  });

  it('creates a team with 3 agents', () => {
    const team = p.createTeam('Support Team');
    const agent1 = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const agent2 = p.createUser({ type: 'human_agent', name: 'Joel', email: 'joel@buildpass.ai' });
    const agent3 = p.createUser({ type: 'human_agent', name: 'Sarah', email: 'sarah@buildpass.ai' });

    p.addTeamMember(team.id, agent1.id, 'lead');
    p.addTeamMember(team.id, agent2.id, 'member');
    p.addTeamMember(team.id, agent3.id, 'member');

    const members = p.getTeamMembers(team.id);
    expect(members).toHaveLength(3);
    expect(members.find((m) => m.role === 'lead')).toBeDefined();
    expect(members.filter((m) => m.role === 'member')).toHaveLength(2);
  });

  it('round-robin routing rule assigns 3 conversations to different agents', () => {
    const team = p.createTeam('Support Team');
    const agent1 = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const agent2 = p.createUser({ type: 'human_agent', name: 'Joel', email: 'joel@buildpass.ai' });
    const agent3 = p.createUser({ type: 'human_agent', name: 'Sarah', email: 'sarah@buildpass.ai' });

    p.addTeamMember(team.id, agent1.id, 'member');
    p.addTeamMember(team.id, agent2.id, 'member');
    p.addTeamMember(team.id, agent3.id, 'member');

    // Create round-robin rule for web chat
    const rule = p.createRoutingRule({
      name: 'Web Chat Round Robin',
      priority: 10,
      conditions: { channel: 'web_chat' },
      action: 'assign_team',
      targetType: 'team',
      targetId: team.id,
    });

    // Create 3 conversations
    const conv1 = p.createConversation({ channelOrigin: 'web_chat' });
    const conv2 = p.createConversation({ channelOrigin: 'web_chat' });
    const conv3 = p.createConversation({ channelOrigin: 'web_chat' });

    // Evaluate and execute routing for each
    for (const conv of [conv1, conv2, conv3]) {
      const match = p.evaluateRouting({
        id: conv.id,
        channelOrigin: conv.channelOrigin,
      });
      expect(match).not.toBeNull();
      p.executeRoutingAction(conv.id, match!, 'system');
    }

    // Each should be assigned to a different agent
    const assignees = new Set([
      p.getConversation(conv1.id)!.assigneeId,
      p.getConversation(conv2.id)!.assigneeId,
      p.getConversation(conv3.id)!.assigneeId,
    ]);

    expect(assignees.size).toBe(3);
    expect(assignees.has(agent1.id)).toBe(true);
    expect(assignees.has(agent2.id)).toBe(true);
    expect(assignees.has(agent3.id)).toBe(true);
  });

  it('priority routing rule routes "billing" keyword to specific agent', () => {
    const billingAgent = p.createUser({
      type: 'human_agent',
      name: 'Billing Specialist',
      email: 'billing@buildpass.ai',
    });

    const team = p.createTeam('General Support');
    const generalAgent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    p.addTeamMember(team.id, generalAgent.id, 'member');

    // High priority: billing keyword -> specific agent
    p.createRoutingRule({
      name: 'Billing Priority',
      priority: 1,
      conditions: { keywords: ['billing'] },
      action: 'assign_agent',
      targetType: 'user',
      targetId: billingAgent.id,
    });

    // Lower priority: general web chat -> team
    p.createRoutingRule({
      name: 'General Web Chat',
      priority: 10,
      conditions: { channel: 'web_chat' },
      action: 'assign_team',
      targetType: 'team',
      targetId: team.id,
    });

    // Conversation with "billing" in subject
    const billingConv = p.createConversation({
      channelOrigin: 'web_chat',
      subject: 'Question about billing',
    });

    const match = p.evaluateRouting({
      id: billingConv.id,
      channelOrigin: billingConv.channelOrigin,
      subject: billingConv.subject,
    });

    expect(match).not.toBeNull();
    expect(match!.targetId).toBe(billingAgent.id);

    p.executeRoutingAction(billingConv.id, match!, 'system');
    expect(p.getConversation(billingConv.id)!.assigneeId).toBe(billingAgent.id);
  });

  it('general conversation without keywords matches lower-priority rule', () => {
    const billingAgent = p.createUser({
      type: 'human_agent',
      name: 'Billing Specialist',
      email: 'billing@buildpass.ai',
    });

    const team = p.createTeam('General Support');
    const generalAgent = p.createUser({
      type: 'human_agent',
      name: 'Joanna',
      email: 'joanna@buildpass.ai',
    });
    p.addTeamMember(team.id, generalAgent.id, 'member');

    p.createRoutingRule({
      name: 'Billing Priority',
      priority: 1,
      conditions: { keywords: ['billing'] },
      action: 'assign_agent',
      targetType: 'user',
      targetId: billingAgent.id,
    });

    p.createRoutingRule({
      name: 'General Web Chat',
      priority: 10,
      conditions: { channel: 'web_chat' },
      action: 'assign_team',
      targetType: 'team',
      targetId: team.id,
    });

    // Conversation without "billing"
    const generalConv = p.createConversation({
      channelOrigin: 'web_chat',
      subject: 'How do I use the platform?',
    });

    const match = p.evaluateRouting({
      id: generalConv.id,
      channelOrigin: generalConv.channelOrigin,
      subject: generalConv.subject,
    });

    expect(match).not.toBeNull();
    expect(match!.targetId).toBe(team.id);
    expect(match!.action).toBe('assign_team');
  });

  it('manual reassignment works', () => {
    const agent1 = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });
    const agent2 = p.createUser({ type: 'human_agent', name: 'Joel', email: 'joel@buildpass.ai' });

    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    p.assignConversation(conv.id, agent1.id, 'system');

    expect(p.getConversation(conv.id)!.assigneeId).toBe(agent1.id);

    // Manually reassign to agent2
    p.assignConversation(conv.id, agent2.id, agent1.id);

    expect(p.getConversation(conv.id)!.assigneeId).toBe(agent2.id);

    // Both assignment events recorded
    const events = p.getEvents(conv.id);
    const assignEvents = events.filter((e) => e.eventType === 'assigned');
    expect(assignEvents).toHaveLength(2);
  });

  it('unassigned conversations queryable', () => {
    const agent = p.createUser({ type: 'human_agent', name: 'Joanna', email: 'joanna@buildpass.ai' });

    const assigned1 = p.createConversation({ channelOrigin: 'web_chat' });
    const assigned2 = p.createConversation({ channelOrigin: 'email' });
    const unassigned1 = p.createConversation({ channelOrigin: 'web_chat' });
    const unassigned2 = p.createConversation({ channelOrigin: 'web_chat' });

    p.assignConversation(assigned1.id, agent.id, 'system');
    p.assignConversation(assigned2.id, agent.id, 'system');

    // Query unassigned
    const all = p.listConversations();
    const unassigned = all.filter((c) => !c.assigneeId);
    const assignedToAgent = all.filter((c) => c.assigneeId === agent.id);

    expect(unassigned).toHaveLength(2);
    expect(assignedToAgent).toHaveLength(2);
  });

  it('round-robin wraps around after exhausting team members', () => {
    const team = p.createTeam('Small Team');
    const agent1 = p.createUser({ type: 'human_agent', name: 'A', email: 'a@test.com' });
    const agent2 = p.createUser({ type: 'human_agent', name: 'B', email: 'b@test.com' });

    p.addTeamMember(team.id, agent1.id, 'member');
    p.addTeamMember(team.id, agent2.id, 'member');

    const rule = p.createRoutingRule({
      name: 'RR',
      priority: 1,
      conditions: {},
      action: 'assign_team',
      targetType: 'team',
      targetId: team.id,
    });

    // Create 5 conversations — should wrap around
    const assignees: string[] = [];
    for (let i = 0; i < 5; i++) {
      const conv = p.createConversation({ channelOrigin: 'web_chat' });
      const match = p.evaluateRouting({ id: conv.id, channelOrigin: 'web_chat' });
      p.executeRoutingAction(conv.id, match!, 'system');
      assignees.push(p.getConversation(conv.id)!.assigneeId!);
    }

    // Pattern should be A, B, A, B, A
    expect(assignees[0]).toBe(agent1.id);
    expect(assignees[1]).toBe(agent2.id);
    expect(assignees[2]).toBe(agent1.id);
    expect(assignees[3]).toBe(agent2.id);
    expect(assignees[4]).toBe(agent1.id);
  });

  it('no matching rule returns null', () => {
    // Create a rule that only matches email
    p.createRoutingRule({
      name: 'Email Only',
      priority: 1,
      conditions: { channel: 'email' },
      action: 'assign_agent',
      targetType: 'user',
      targetId: randomUUID(),
    });

    // Try to route a web chat conversation
    const conv = p.createConversation({ channelOrigin: 'web_chat' });
    const match = p.evaluateRouting({
      id: conv.id,
      channelOrigin: conv.channelOrigin,
    });

    expect(match).toBeNull();
  });
});

function randomUUID(): string {
  return crypto.randomUUID();
}
