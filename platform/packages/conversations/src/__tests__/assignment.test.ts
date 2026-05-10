import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers.js';
import {
  assignConversation,
  unassignConversation,
  getAssignee,
  getAssignedConversations,
  getUnassignedConversations,
} from '../data/assignment.js';
import { isParticipant } from '../data/participants.js';

const CONV_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CONV_ID_2 = 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff';
const AGENT_A = '11111111-1111-1111-1111-111111111111';
const AGENT_B = '22222222-2222-2222-2222-222222222222';
const ACTOR = '99999999-9999-9999-9999-999999999999';

describe('assignment', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
    db.seedUser(AGENT_A, 'Agent A', 'a@buildpass.com.au');
    db.seedUser(AGENT_B, 'Agent B', 'b@buildpass.com.au');
    db.seedUser(ACTOR, 'Actor', 'actor@buildpass.com.au');

    db.seedConversation({
      id: CONV_ID,
      displayId: 1,
      status: 'open',
      priority: 'medium',
      subject: 'Test conversation',
      assigneeId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    db.seedConversation({
      id: CONV_ID_2,
      displayId: 2,
      status: 'pending',
      priority: 'high',
      subject: 'Another conversation',
      assigneeId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('assigns a conversation and creates an event', async () => {
    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);

    const assignee = await getAssignee(db, CONV_ID);
    expect(assignee?.id).toBe(AGENT_A);

    const events = db.getEvents();
    const assignedEvents = events.filter((e) => e.eventType === 'assigned');
    expect(assignedEvents).toHaveLength(1);
    expect(assignedEvents[0]!.actorId).toBe(ACTOR);
    expect(assignedEvents[0]!.payload).toEqual({ assigneeId: AGENT_A });
  });

  it('auto-adds assignee as participant if not already present', async () => {
    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);

    const isMember = await isParticipant(db, CONV_ID, AGENT_A);
    expect(isMember).toBe(true);

    const events = db.getEvents();
    const joinEvents = events.filter((e) => e.eventType === 'participant_joined');
    expect(joinEvents).toHaveLength(1);
    expect(joinEvents[0]!.payload).toMatchObject({ userId: AGENT_A, role: 'assignee' });
  });

  it('does not duplicate participant on re-assignment', async () => {
    // Pre-add agent as participant
    await db.participants.add(CONV_ID, AGENT_A, 'observer');

    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);

    const events = db.getEvents();
    const joinEvents = events.filter((e) => e.eventType === 'participant_joined');
    expect(joinEvents).toHaveLength(0); // no duplicate join
  });

  it('unassigns and creates an event', async () => {
    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);
    await unassignConversation(db, CONV_ID, ACTOR);

    const assignee = await getAssignee(db, CONV_ID);
    expect(assignee).toBeNull();

    const events = db.getEvents();
    const unassignedEvents = events.filter((e) => e.eventType === 'unassigned');
    expect(unassignedEvents).toHaveLength(1);
    expect(unassignedEvents[0]!.payload).toEqual({ previousAssigneeId: AGENT_A });
  });

  it('lists assigned conversations for a user', async () => {
    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);
    await assignConversation(db, CONV_ID_2, AGENT_A, ACTOR);

    const assigned = await getAssignedConversations(db, AGENT_A);
    expect(assigned).toHaveLength(2);
  });

  it('filters assigned conversations by status', async () => {
    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);
    await assignConversation(db, CONV_ID_2, AGENT_A, ACTOR);

    const openOnly = await getAssignedConversations(db, AGENT_A, { status: 'open' });
    expect(openOnly).toHaveLength(1);
    expect(openOnly[0]!.id).toBe(CONV_ID);
  });

  it('lists unassigned conversations', async () => {
    const unassigned = await getUnassignedConversations(db);
    expect(unassigned).toHaveLength(2);

    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);

    const remaining = await getUnassignedConversations(db);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(CONV_ID_2);
  });

  it('reassigns from one agent to another', async () => {
    await assignConversation(db, CONV_ID, AGENT_A, ACTOR);
    await assignConversation(db, CONV_ID, AGENT_B, ACTOR);

    const assignee = await getAssignee(db, CONV_ID);
    expect(assignee?.id).toBe(AGENT_B);

    const events = db.getEvents();
    const assignedEvents = events.filter((e) => e.eventType === 'assigned');
    expect(assignedEvents).toHaveLength(2);
    expect(assignedEvents[1]!.payload).toEqual({ assigneeId: AGENT_B });
  });

  it('unassign on already-unassigned records null previousAssigneeId', async () => {
    await unassignConversation(db, CONV_ID, ACTOR);

    const events = db.getEvents();
    const unassignedEvents = events.filter((e) => e.eventType === 'unassigned');
    expect(unassignedEvents).toHaveLength(1);
    expect(unassignedEvents[0]!.payload).toEqual({ previousAssigneeId: null });
  });

  it('returns empty list for user with no assignments', async () => {
    const assigned = await getAssignedConversations(db, AGENT_A);
    expect(assigned).toHaveLength(0);
  });

  it('filters unassigned conversations by status', async () => {
    const openOnly = await getUnassignedConversations(db, { status: 'open' });
    expect(openOnly).toHaveLength(1);
    expect(openOnly[0]!.id).toBe(CONV_ID);
  });
});
