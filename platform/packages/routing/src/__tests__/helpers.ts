import type {
  RoutingDb,
  RoutingRule,
  RoutingRuleCreate,
  RoutingRuleUpdate,
  Team,
  TeamCreate,
  TeamMember,
  TeamMemberRole,
  ConversationStatus,
} from '../types.js';

/**
 * In-memory mock database for testing.
 * Stores routing rules, teams, team members, and conversations in Maps.
 */
export function createMockDb(): RoutingDb & {
  _rules: Map<string, RoutingRule>;
  _teams: Map<string, Team>;
  _teamMembers: Map<string, TeamMember[]>;
  _conversations: Map<string, { id: string; status: ConversationStatus; assigneeId: string | null }>;
  _events: Array<{ conversationId: string; actorId: string; eventType: string; payload: Record<string, unknown> }>;
  _addConversation(id: string, status: ConversationStatus, snoozedUntil?: Date): void;
} {
  const rules = new Map<string, RoutingRule>();
  const teams = new Map<string, Team>();
  const teamMembers = new Map<string, TeamMember[]>();
  const conversations = new Map<string, {
    id: string;
    status: ConversationStatus;
    assigneeId: string | null;
    snoozedUntil?: Date;
  }>();

  let ruleCounter = 0;
  let teamCounter = 0;

  return {
    _rules: rules,
    _teams: teams,
    _teamMembers: teamMembers,
    _conversations: conversations,

    _addConversation(id: string, status: ConversationStatus, snoozedUntil?: Date) {
      conversations.set(id, { id, status, assigneeId: null, snoozedUntil });
    },

    // Routing rules
    async listRoutingRules(): Promise<RoutingRule[]> {
      return [...rules.values()].sort((a, b) => a.priority - b.priority);
    },

    async getRoutingRule(id: string): Promise<RoutingRule | null> {
      return rules.get(id) ?? null;
    },

    async createRoutingRule(data: RoutingRuleCreate): Promise<RoutingRule> {
      const id = `rule-${++ruleCounter}`;
      const rule: RoutingRule = {
        id,
        name: data.name,
        priority: data.priority,
        conditions: data.conditions,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        active: data.active ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rules.set(id, rule);
      return rule;
    },

    async updateRoutingRule(id: string, data: RoutingRuleUpdate): Promise<RoutingRule | null> {
      const existing = rules.get(id);
      if (!existing) return null;
      const updated: RoutingRule = {
        ...existing,
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        ),
        updatedAt: new Date(),
      };
      rules.set(id, updated);
      return updated;
    },

    async deleteRoutingRule(id: string): Promise<boolean> {
      return rules.delete(id);
    },

    // Teams
    async listTeams(): Promise<Team[]> {
      return [...teams.values()];
    },

    async getTeam(id: string): Promise<Team | null> {
      return teams.get(id) ?? null;
    },

    async createTeam(data: TeamCreate): Promise<Team> {
      const id = `team-${++teamCounter}`;
      const team: Team = {
        id,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      teams.set(id, team);
      teamMembers.set(id, []);
      return team;
    },

    async deleteTeam(id: string): Promise<boolean> {
      teamMembers.delete(id);
      return teams.delete(id);
    },

    async getTeamMembers(teamId: string): Promise<TeamMember[]> {
      return teamMembers.get(teamId) ?? [];
    },

    async addTeamMember(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMember> {
      const member: TeamMember = {
        teamId,
        userId,
        role,
        createdAt: new Date(),
      };
      const members = teamMembers.get(teamId) ?? [];
      members.push(member);
      teamMembers.set(teamId, members);
      return member;
    },

    async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
      const members = teamMembers.get(teamId);
      if (!members) return false;
      const idx = members.findIndex((m) => m.userId === userId);
      if (idx === -1) return false;
      members.splice(idx, 1);
      return true;
    },

    // Conversations
    async getSnoozedConversationsDue(): Promise<Array<{ id: string }>> {
      const now = new Date();
      return [...conversations.values()]
        .filter((c) => c.status === 'snoozed' && c.snoozedUntil && c.snoozedUntil <= now)
        .map((c) => ({ id: c.id }));
    },

    async updateConversationStatus(id: string, status: ConversationStatus): Promise<void> {
      const conv = conversations.get(id);
      if (conv) {
        conv.status = status;
      }
    },

    async assignConversation(conversationId: string, assigneeId: string): Promise<void> {
      const conv = conversations.get(conversationId);
      if (conv) {
        conv.assigneeId = assigneeId;
      }
    },

    _events: [] as Array<{ conversationId: string; actorId: string; eventType: string; payload: Record<string, unknown> }>,

    async createConversationEvent(data: {
      conversationId: string;
      actorId: string;
      eventType: string;
      payload: Record<string, unknown>;
    }): Promise<void> {
      this._events.push(data);
    },
  };
}
