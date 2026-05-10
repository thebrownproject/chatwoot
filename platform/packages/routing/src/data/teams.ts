import type {
  RoutingDb,
  Team,
  TeamCreate,
  TeamMember,
  TeamMemberRole,
} from '../types.js';
import { clearRoundRobinForTeam } from '../engine/assigner.js';

export function listTeams(db: RoutingDb): Promise<Team[]> {
  return db.listTeams();
}

export function getTeam(db: RoutingDb, id: string): Promise<Team | null> {
  return db.getTeam(id);
}

export function createTeam(db: RoutingDb, data: TeamCreate): Promise<Team> {
  const trimmed = data.name.trim();
  if (trimmed.length === 0) {
    throw new Error('Team name cannot be empty or whitespace-only');
  }
  return db.createTeam({ name: trimmed });
}

export async function deleteTeam(db: RoutingDb, id: string): Promise<boolean> {
  const rules = await db.listRoutingRules();
  const activeRulesTargetingTeam = rules.filter(
    (r) => r.active && r.targetType === 'team' && r.targetId === id,
  );
  if (activeRulesTargetingTeam.length > 0) {
    throw new Error(
      `Cannot delete team: ${activeRulesTargetingTeam.length} active routing rule(s) target this team. Deactivate or reassign them first.`,
    );
  }
  clearRoundRobinForTeam(id);
  const deleted = await db.deleteTeam(id);
  return deleted;
}

export function getTeamMembers(
  db: RoutingDb,
  teamId: string,
): Promise<TeamMember[]> {
  return db.getTeamMembers(teamId);
}

export async function addTeamMember(
  db: RoutingDb,
  teamId: string,
  userId: string,
  role: TeamMemberRole = 'member',
): Promise<TeamMember> {
  const existing = await db.getTeamMembers(teamId);
  if (existing.some((m) => m.userId === userId)) {
    throw new Error(`User ${userId} is already a member of team ${teamId}`);
  }
  return db.addTeamMember(teamId, userId, role);
}

export function removeTeamMember(
  db: RoutingDb,
  teamId: string,
  userId: string,
): Promise<boolean> {
  return db.removeTeamMember(teamId, userId);
}
