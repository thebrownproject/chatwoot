import { describe, it, expect, beforeEach } from 'vitest';
import { executeAction, roundRobin, resetRoundRobin } from '../engine/assigner.js';
import { createMockDb } from './helpers.js';

describe('roundRobin', () => {
  beforeEach(() => {
    resetRoundRobin();
  });

  it('returns null for a team with no members', async () => {
    const db = createMockDb();
    await db.createTeam({ name: 'Empty Team' });
    const result = await roundRobin(db, 'team-1');
    expect(result).toBeNull();
  });

  it('cycles through team members in order', async () => {
    const db = createMockDb();
    const team = await db.createTeam({ name: 'Support' });
    await db.addTeamMember(team.id, 'user-a', 'member');
    await db.addTeamMember(team.id, 'user-b', 'member');
    await db.addTeamMember(team.id, 'user-c', 'member');

    expect(await roundRobin(db, team.id)).toBe('user-a');
    expect(await roundRobin(db, team.id)).toBe('user-b');
    expect(await roundRobin(db, team.id)).toBe('user-c');
    // Wraps around
    expect(await roundRobin(db, team.id)).toBe('user-a');
  });

  it('maintains separate counters per team', async () => {
    const db = createMockDb();
    const team1 = await db.createTeam({ name: 'Team 1' });
    const team2 = await db.createTeam({ name: 'Team 2' });
    await db.addTeamMember(team1.id, 'user-a', 'member');
    await db.addTeamMember(team1.id, 'user-b', 'member');
    await db.addTeamMember(team2.id, 'user-x', 'member');
    await db.addTeamMember(team2.id, 'user-y', 'member');

    expect(await roundRobin(db, team1.id)).toBe('user-a');
    expect(await roundRobin(db, team2.id)).toBe('user-x');
    expect(await roundRobin(db, team1.id)).toBe('user-b');
    expect(await roundRobin(db, team2.id)).toBe('user-y');
  });
});

describe('executeAction', () => {
  beforeEach(() => {
    resetRoundRobin();
  });

  it('assigns directly for assign_agent', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'open');

    const result = await executeAction(db, 'conv-1', 'assign_agent', 'user', 'agent-1');
    expect(result.assignedTo).toBe('agent-1');
    expect(db._conversations.get('conv-1')!.assigneeId).toBe('agent-1');
  });

  it('assigns directly for assign_bot', async () => {
    const db = createMockDb();
    db._addConversation('conv-1', 'open');

    const result = await executeAction(db, 'conv-1', 'assign_bot', 'user', 'bot-1');
    expect(result.assignedTo).toBe('bot-1');
    expect(db._conversations.get('conv-1')!.assigneeId).toBe('bot-1');
  });

  it('uses round-robin for assign_team', async () => {
    const db = createMockDb();
    const team = await db.createTeam({ name: 'Support' });
    await db.addTeamMember(team.id, 'user-a', 'member');
    await db.addTeamMember(team.id, 'user-b', 'member');
    db._addConversation('conv-1', 'open');
    db._addConversation('conv-2', 'open');

    const r1 = await executeAction(db, 'conv-1', 'assign_team', 'team', team.id);
    const r2 = await executeAction(db, 'conv-2', 'assign_team', 'team', team.id);

    expect(r1.assignedTo).toBe('user-a');
    expect(r2.assignedTo).toBe('user-b');
  });

  it('throws when team has no members', async () => {
    const db = createMockDb();
    const team = await db.createTeam({ name: 'Empty' });
    db._addConversation('conv-1', 'open');

    await expect(
      executeAction(db, 'conv-1', 'assign_team', 'team', team.id),
    ).rejects.toThrow('No members in team');
  });
});
