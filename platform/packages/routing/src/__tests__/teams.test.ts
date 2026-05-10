import { describe, it, expect } from 'vitest';
import {
  listTeams,
  getTeam,
  createTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from '../data/teams.js';
import { createMockDb } from './helpers.js';

describe('teams CRUD', () => {
  it('creates a team', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });

    expect(team.id).toBeDefined();
    expect(team.name).toBe('Support');
    expect(team.createdAt).toBeInstanceOf(Date);
  });

  it('lists all teams', async () => {
    const db = createMockDb();
    await createTeam(db, { name: 'Support' });
    await createTeam(db, { name: 'Engineering' });

    const teams = await listTeams(db);
    expect(teams).toHaveLength(2);
  });

  it('gets a team by ID', async () => {
    const db = createMockDb();
    const created = await createTeam(db, { name: 'Support' });

    const fetched = await getTeam(db, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('Support');
  });

  it('returns null for nonexistent team', async () => {
    const db = createMockDb();
    const result = await getTeam(db, 'nonexistent');
    expect(result).toBeNull();
  });

  it('deletes a team with no active rules', async () => {
    const db = createMockDb();
    const created = await createTeam(db, { name: 'To Delete' });

    const deleted = await deleteTeam(db, created.id);
    expect(deleted).toBe(true);

    const fetched = await getTeam(db, created.id);
    expect(fetched).toBeNull();
  });

  it('rejects deleting a team with active routing rules', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Active Team' });
    await db.createRoutingRule({
      name: 'Route to team',
      priority: 1,
      conditions: {},
      action: 'assign_team',
      targetType: 'team',
      targetId: team.id,
      active: true,
    });

    await expect(deleteTeam(db, team.id)).rejects.toThrow('active routing rule');
  });
});

describe('team membership', () => {
  it('adds a member to a team', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });

    const member = await addTeamMember(db, team.id, 'user-1', 'member');
    expect(member.teamId).toBe(team.id);
    expect(member.userId).toBe('user-1');
    expect(member.role).toBe('member');
  });

  it('adds a lead member', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });

    const member = await addTeamMember(db, team.id, 'user-1', 'lead');
    expect(member.role).toBe('lead');
  });

  it('gets all members of a team', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });
    await addTeamMember(db, team.id, 'user-1', 'lead');
    await addTeamMember(db, team.id, 'user-2', 'member');
    await addTeamMember(db, team.id, 'user-3', 'member');

    const members = await getTeamMembers(db, team.id);
    expect(members).toHaveLength(3);
  });

  it('returns empty array for team with no members', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Empty' });

    const members = await getTeamMembers(db, team.id);
    expect(members).toHaveLength(0);
  });

  it('removes a member from a team', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });
    await addTeamMember(db, team.id, 'user-1', 'member');
    await addTeamMember(db, team.id, 'user-2', 'member');

    const removed = await removeTeamMember(db, team.id, 'user-1');
    expect(removed).toBe(true);

    const members = await getTeamMembers(db, team.id);
    expect(members).toHaveLength(1);
    expect(members[0]!.userId).toBe('user-2');
  });

  it('returns false when removing nonexistent member', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });

    const removed = await removeTeamMember(db, team.id, 'nonexistent');
    expect(removed).toBe(false);
  });

  it('rejects adding a duplicate member', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: 'Support' });
    await addTeamMember(db, team.id, 'user-1', 'member');

    await expect(
      addTeamMember(db, team.id, 'user-1', 'lead'),
    ).rejects.toThrow('already a member');
  });

  it('allows same user in different teams', async () => {
    const db = createMockDb();
    const team1 = await createTeam(db, { name: 'Team A' });
    const team2 = await createTeam(db, { name: 'Team B' });

    const m1 = await addTeamMember(db, team1.id, 'user-1', 'member');
    const m2 = await addTeamMember(db, team2.id, 'user-1', 'member');
    expect(m1.teamId).toBe(team1.id);
    expect(m2.teamId).toBe(team2.id);
  });
});

describe('team name validation', () => {
  it('rejects whitespace-only team name', () => {
    const db = createMockDb();
    expect(() => createTeam(db, { name: '   ' })).toThrow(
      'empty or whitespace',
    );
  });

  it('trims team name whitespace', async () => {
    const db = createMockDb();
    const team = await createTeam(db, { name: '  Support  ' });
    expect(team.name).toBe('Support');
  });
});
