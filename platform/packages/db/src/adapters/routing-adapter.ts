/**
 * Routing adapter — implements the routing module's expected RoutingDb
 * interface using the Drizzle repository.
 *
 * Replaces the custom RoutingDb DI interface with a concrete Drizzle-backed
 * implementation, including team management and routing rule evaluation.
 */
import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../client.js';
import { routingRules } from '../schema/routing-rules.js';
import { teams, teamMembers } from '../schema/teams.js';
import type {
  RoutingRule,
  NewRoutingRule,
  Team,
  NewTeam,
  TeamMember,
  NewTeamMember,
} from '../types.js';

export interface RoutingDb {
  // Rules
  findActiveRules(): Promise<RoutingRule[]>;
  findRuleById(id: string): Promise<RoutingRule | undefined>;
  createRule(data: NewRoutingRule): Promise<RoutingRule>;
  updateRule(
    id: string,
    data: Partial<NewRoutingRule>,
  ): Promise<RoutingRule | undefined>;
  deleteRule(id: string): Promise<void>;

  // Teams
  findTeamById(id: string): Promise<Team | undefined>;
  findTeamMembers(teamId: string): Promise<TeamMember[]>;
  createTeam(data: NewTeam): Promise<Team>;
  addTeamMember(data: NewTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
}

export class RoutingAdapter implements RoutingDb {
  constructor(private readonly db: Db) {}

  // ── Rules ────────────────────────────────────────────────────────

  async findActiveRules(): Promise<RoutingRule[]> {
    return this.db
      .select()
      .from(routingRules)
      .where(eq(routingRules.active, true))
      .orderBy(asc(routingRules.priority));
  }

  async findRuleById(id: string): Promise<RoutingRule | undefined> {
    const rows = await this.db
      .select()
      .from(routingRules)
      .where(eq(routingRules.id, id))
      .limit(1);
    return rows[0];
  }

  async createRule(data: NewRoutingRule): Promise<RoutingRule> {
    const rows = await this.db
      .insert(routingRules)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async updateRule(
    id: string,
    data: Partial<NewRoutingRule>,
  ): Promise<RoutingRule | undefined> {
    const rows = await this.db
      .update(routingRules)
      .set(data)
      .where(eq(routingRules.id, id))
      .returning();
    return rows[0];
  }

  async deleteRule(id: string): Promise<void> {
    await this.db.delete(routingRules).where(eq(routingRules.id, id));
  }

  // ── Teams ────────────────────────────────────────────────────────

  async findTeamById(id: string): Promise<Team | undefined> {
    const rows = await this.db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);
    return rows[0];
  }

  async findTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
  }

  async createTeam(data: NewTeam): Promise<Team> {
    const rows = await this.db
      .insert(teams)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async addTeamMember(data: NewTeamMember): Promise<TeamMember> {
    const rows = await this.db
      .insert(teamMembers)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return rows[0]!;
  }

  async removeTeamMember(
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
        ),
      );
  }
}
