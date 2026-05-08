/**
 * E2E: Routing and assignment
 *
 * Round-robin, keyword routing, manual reassignment.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform, getRoutingAssignment } from './setup.js';
import type { RoutingRule, RoutableConversation } from './setup.js';

let p: Platform;

beforeEach(() => {
  p = createPlatform();
});

describe('Routing and assignment', () => {
  describe('Rule evaluation', () => {
    it('matches a rule by channel', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'email',
        subject: 'Help needed',
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-1',
          name: 'Email to support',
          priority: 1,
          conditions: { channel: 'email' },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'agent-1',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match).toBeTruthy();
      expect(match!.ruleId).toBe('rule-1');
      expect(match!.action).toBe('assign_agent');
      expect(match!.targetId).toBe('agent-1');
    });

    it('matches a rule by keyword in subject', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'web_chat',
        subject: 'I need help with billing',
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-billing',
          name: 'Billing keywords',
          priority: 1,
          conditions: { keywords: ['billing', 'invoice', 'payment'] },
          action: 'assign_team',
          targetType: 'team',
          targetId: 'billing-team',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match).toBeTruthy();
      expect(match!.ruleName).toBe('Billing keywords');
      expect(match!.action).toBe('assign_team');
    });

    it('matches a rule by keyword in body', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'web_chat',
        subject: 'Question',
        body: 'I have a billing question about my invoice',
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-billing',
          name: 'Billing keywords',
          priority: 1,
          conditions: { keywords: ['billing'] },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'billing-agent',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match).toBeTruthy();
    });

    it('evaluates rules in priority order (lower number = higher priority)', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'email',
        subject: 'Billing help',
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-low-priority',
          name: 'Catch-all email',
          priority: 10,
          conditions: { channel: 'email' },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'general-agent',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rule-high-priority',
          name: 'Billing keywords',
          priority: 1,
          conditions: { keywords: ['billing'] },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'billing-agent',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match!.ruleId).toBe('rule-high-priority');
      expect(match!.targetId).toBe('billing-agent');
    });

    it('skips inactive rules', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'email',
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-inactive',
          name: 'Disabled rule',
          priority: 1,
          conditions: { channel: 'email' },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'agent-1',
          active: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match).toBeNull();
    });

    it('returns null when no rules match', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'sms',
        subject: 'Hello',
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-email',
          name: 'Email only',
          priority: 1,
          conditions: { channel: 'email' },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'agent-1',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match).toBeNull();
    });

    it('matches on labels', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'web_chat',
        labels: ['vip', 'enterprise'],
      };

      const rules: RoutingRule[] = [
        {
          id: 'rule-vip',
          name: 'VIP routing',
          priority: 1,
          conditions: { labels: ['vip'] },
          action: 'assign_agent',
          targetType: 'user',
          targetId: 'senior-agent',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const match = p.routing.evaluate(conversation, rules);
      expect(match).toBeTruthy();
      expect(match!.targetId).toBe('senior-agent');
    });

    it('requires all conditions to match (AND logic)', () => {
      const conversation: RoutableConversation = {
        id: 'conv-1',
        channelOrigin: 'web_chat', // Does NOT match email
        subject: 'Billing question',
      };

      // Rule requires email channel AND billing keyword
      const matched = p.routing.matchConditions(conversation, {
        channel: 'email',
        keywords: ['billing'],
      });

      expect(matched).toBe(false);
    });
  });

  describe('Round-robin assignment', () => {
    it('round-robins through team members', async () => {
      // Create team with members
      const team = await p.routingDb.createTeam({ name: 'Support Team' });
      await p.routingDb.addTeamMember(team.id, 'agent-a', 'member');
      await p.routingDb.addTeamMember(team.id, 'agent-b', 'member');
      await p.routingDb.addTeamMember(team.id, 'agent-c', 'member');

      // First assignment -> agent-a
      const first = await p.routing.roundRobin(p.routingDb, team.id);
      expect(first).toBe('agent-a');

      // Second -> agent-b
      const second = await p.routing.roundRobin(p.routingDb, team.id);
      expect(second).toBe('agent-b');

      // Third -> agent-c
      const third = await p.routing.roundRobin(p.routingDb, team.id);
      expect(third).toBe('agent-c');

      // Fourth -> wraps back to agent-a
      const fourth = await p.routing.roundRobin(p.routingDb, team.id);
      expect(fourth).toBe('agent-a');
    });

    it('returns null for empty teams', async () => {
      const emptyTeam = await p.routingDb.createTeam({ name: 'Empty Team' });
      const result = await p.routing.roundRobin(p.routingDb, emptyTeam.id);
      expect(result).toBeNull();
    });
  });

  describe('Action execution', () => {
    it('assigns directly to an agent', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'email' });

      await p.routing.executeAction(
        p.routingDb,
        conv.id,
        'assign_agent',
        'user',
        'agent-direct',
      );

      const assignment = getRoutingAssignment(conv.id);
      expect(assignment).toBe('agent-direct');
    });

    it('assigns via round-robin to a team', async () => {
      const team = await p.routingDb.createTeam({ name: 'Rotation Team' });
      await p.routingDb.addTeamMember(team.id, 'agent-x', 'member');
      await p.routingDb.addTeamMember(team.id, 'agent-y', 'member');

      const conv = await p.conversations.create(p.db, { channelOrigin: 'web_chat' });

      const result = await p.routing.executeAction(
        p.routingDb,
        conv.id,
        'assign_team',
        'team',
        team.id,
      );

      expect(result.assignedTo).toBe('agent-x');
    });

    it('assigns to a bot agent', async () => {
      const conv = await p.conversations.create(p.db, { channelOrigin: 'web_chat' });

      await p.routing.executeAction(
        p.routingDb,
        conv.id,
        'assign_bot',
        'user',
        'ron-bot',
      );

      const assignment = getRoutingAssignment(conv.id);
      expect(assignment).toBe('ron-bot');
    });

    it('throws when round-robin team has no members', async () => {
      const emptyTeam = await p.routingDb.createTeam({ name: 'Empty' });

      await expect(
        p.routing.executeAction(p.routingDb, 'conv-1', 'assign_team', 'team', emptyTeam.id),
      ).rejects.toThrow(/No members/);
    });
  });

  describe('Manual reassignment', () => {
    it('reassigns a conversation from one agent to another', async () => {
      const agent1 = p.users.create({ type: 'human_agent', name: 'Agent 1' });
      const agent2 = p.users.create({ type: 'human_agent', name: 'Agent 2' });

      const conv = await p.conversations.create(p.db, {
        channelOrigin: 'email',
        assigneeId: agent1.id,
      });

      expect(conv.assigneeId).toBe(agent1.id);

      const updated = await p.conversations.update(p.db, conv.id, {
        assigneeId: agent2.id,
      });

      expect(updated?.assigneeId).toBe(agent2.id);
    });

    it('unassigns a conversation (set assignee to null)', async () => {
      const agent = p.users.create({ type: 'human_agent', name: 'Agent' });

      const conv = await p.conversations.create(p.db, {
        channelOrigin: 'web_chat',
        assigneeId: agent.id,
      });

      const unassigned = await p.conversations.update(p.db, conv.id, {
        assigneeId: null,
      });

      expect(unassigned?.assigneeId).toBeNull();
    });
  });
});
