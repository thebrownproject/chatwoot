import type {
  RoutingDb,
  Team,
  TeamCreate,
  TeamMember,
  TeamMemberRole,
} from '../types.js';

/** List all teams. */
export function listTeams(db: RoutingDb): Promise<Team[]> {
  return db.listTeams();
}

/** Get a single team by ID. */
export function getTeam(db: RoutingDb, id: string): Promise<Team | null> {
  return db.getTeam(id);
}

/** Create a new team. */
export function createTeam(db: RoutingDb, data: TeamCreate): Promise<Team> {
  return db.createTeam(data);
}

/** Delete a team. Returns true if deleted, false if not found. */
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
  return db.deleteTeam(id);
}

/** Get all members of a team. */
export function getTeamMembers(
  db: RoutingDb,
  teamId: string,
): Promise<TeamMember[]> {
  return db.getTeamMembers(teamId);
}

/** Add a member to a team. Defaults to 'member' role. */
export function addTeamMember(
  db: RoutingDb,
  teamId: string,
  userId: string,
  role: TeamMemberRole = 'member',
): Promise<TeamMember> {
  return db.addTeamMember(teamId, userId, role);
}

/** Remove a member from a team. */
export function removeTeamMember(
  db: RoutingDb,
  teamId: string,
  userId: string,
): Promise<boolean> {
  return db.removeTeamMember(teamId, userId);
}
