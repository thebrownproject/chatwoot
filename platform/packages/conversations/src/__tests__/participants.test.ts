import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers.js';
import {
  addParticipant,
  removeParticipant,
  getParticipants,
  getParticipantRole,
  updateParticipantRole,
  isParticipant,
} from '../data/participants.js';

const CONV_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

describe('participants', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
    db.seedUser(USER_A, 'Alice', 'alice@buildpass.com.au');
    db.seedUser(USER_B, 'Bob', 'bob@buildpass.com.au');
  });

  it('adds a participant and creates a join event', async () => {
    const p = await addParticipant(db, CONV_ID, USER_A, 'observer');

    expect(p.userId).toBe(USER_A);
    expect(p.role).toBe('observer');
    expect(p.leftAt).toBeNull();

    const events = db.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('participant_joined');
    expect(events[0]!.payload).toEqual({ userId: USER_A, role: 'observer' });
  });

  it('prevents duplicate participants', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'observer');

    await expect(addParticipant(db, CONV_ID, USER_A, 'observer')).rejects.toThrow(
      /already a participant/,
    );
  });

  it('removes a participant and creates a leave event', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'observer');
    await removeParticipant(db, CONV_ID, USER_A);

    const active = await getParticipants(db, CONV_ID);
    expect(active).toHaveLength(0);

    const events = db.getEvents();
    const leaveEvents = events.filter((e) => e.eventType === 'participant_left');
    expect(leaveEvents).toHaveLength(1);
    expect(leaveEvents[0]!.payload).toEqual({ userId: USER_A });
  });

  it('throws when removing a non-participant', async () => {
    await expect(removeParticipant(db, CONV_ID, USER_A)).rejects.toThrow(
      /not a participant/,
    );
  });

  it('lists active participants with user details', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'observer');
    await addParticipant(db, CONV_ID, USER_B, 'contact');

    const list = await getParticipants(db, CONV_ID);
    expect(list).toHaveLength(2);
    expect(list[0]!.user.name).toBe('Alice');
    expect(list[1]!.user.name).toBe('Bob');
  });

  it('gets a participant role', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'copilot');

    const role = await getParticipantRole(db, CONV_ID, USER_A);
    expect(role).toBe('copilot');
  });

  it('returns null for non-participant role', async () => {
    const role = await getParticipantRole(db, CONV_ID, USER_A);
    expect(role).toBeNull();
  });

  it('updates participant role and creates event', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'observer');
    await updateParticipantRole(db, CONV_ID, USER_A, 'copilot');

    const role = await getParticipantRole(db, CONV_ID, USER_A);
    expect(role).toBe('copilot');

    const events = db.getEvents();
    const roleEvents = events.filter((e) => e.eventType === 'role_changed');
    expect(roleEvents).toHaveLength(1);
    expect(roleEvents[0]!.payload).toEqual({
      userId: USER_A,
      fromRole: 'observer',
      toRole: 'copilot',
    });
  });

  it('throws when updating role for non-participant', async () => {
    await expect(
      updateParticipantRole(db, CONV_ID, USER_A, 'copilot'),
    ).rejects.toThrow(/not a participant/);
  });

  it('checks membership correctly', async () => {
    expect(await isParticipant(db, CONV_ID, USER_A)).toBe(false);
    await addParticipant(db, CONV_ID, USER_A, 'observer');
    expect(await isParticipant(db, CONV_ID, USER_A)).toBe(true);
    await removeParticipant(db, CONV_ID, USER_A);
    expect(await isParticipant(db, CONV_ID, USER_A)).toBe(false);
  });

  it('prevents removing a contact from their conversation', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'contact');

    await expect(removeParticipant(db, CONV_ID, USER_A)).rejects.toThrow(
      /Cannot remove the contact/,
    );

    expect(await isParticipant(db, CONV_ID, USER_A)).toBe(true);
  });

  it('prevents changing the role of a contact', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'contact');

    await expect(
      updateParticipantRole(db, CONV_ID, USER_A, 'observer'),
    ).rejects.toThrow(/Cannot change the role of the contact/);

    const role = await getParticipantRole(db, CONV_ID, USER_A);
    expect(role).toBe('contact');
  });

  it('skips no-op role update without creating event', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'observer');

    const eventsBefore = db.getEvents().length;
    await updateParticipantRole(db, CONV_ID, USER_A, 'observer');
    const eventsAfter = db.getEvents().length;

    expect(eventsAfter).toBe(eventsBefore);
  });

  it('records correct actorId when provided to addParticipant', async () => {
    const ADMIN = '33333333-3333-3333-3333-333333333333';
    db.seedUser(ADMIN, 'Admin', 'admin@buildpass.com.au');

    await addParticipant(db, CONV_ID, USER_A, 'observer', ADMIN);

    const events = db.getEvents();
    const joinEvent = events.find((e) => e.eventType === 'participant_joined');
    expect(joinEvent!.actorId).toBe(ADMIN);
    expect(joinEvent!.payload).toEqual({ userId: USER_A, role: 'observer' });
  });

  it('records correct actorId when provided to removeParticipant', async () => {
    const ADMIN = '33333333-3333-3333-3333-333333333333';
    db.seedUser(ADMIN, 'Admin', 'admin@buildpass.com.au');

    await addParticipant(db, CONV_ID, USER_A, 'observer');
    await removeParticipant(db, CONV_ID, USER_A, ADMIN);

    const events = db.getEvents();
    const leaveEvent = events.find((e) => e.eventType === 'participant_left');
    expect(leaveEvent!.actorId).toBe(ADMIN);
  });

  it('records correct actorId when provided to updateParticipantRole', async () => {
    const ADMIN = '33333333-3333-3333-3333-333333333333';
    db.seedUser(ADMIN, 'Admin', 'admin@buildpass.com.au');

    await addParticipant(db, CONV_ID, USER_A, 'observer');
    await updateParticipantRole(db, CONV_ID, USER_A, 'copilot', ADMIN);

    const events = db.getEvents();
    const roleEvent = events.find((e) => e.eventType === 'role_changed');
    expect(roleEvent!.actorId).toBe(ADMIN);
  });

  it('defaults actorId to userId when not provided', async () => {
    await addParticipant(db, CONV_ID, USER_A, 'observer');

    const events = db.getEvents();
    const joinEvent = events.find((e) => e.eventType === 'participant_joined');
    expect(joinEvent!.actorId).toBe(USER_A);
  });
});
