import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers.js';
import { createEvent, listEvents, getEventsByType } from '../data/events.js';

const CONV_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const ACTOR = '99999999-9999-9999-9999-999999999999';

describe('events', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates an event', async () => {
    const event = await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'status_changed',
      payload: { from: 'open', to: 'resolved' },
    });

    expect(event.id).toBeDefined();
    expect(event.conversationId).toBe(CONV_ID);
    expect(event.actorId).toBe(ACTOR);
    expect(event.eventType).toBe('status_changed');
    expect(event.payload).toEqual({ from: 'open', to: 'resolved' });
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it('lists events ordered by created_at', async () => {
    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'assigned',
      payload: { assigneeId: 'agent-1' },
    });
    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'status_changed',
      payload: { from: 'open', to: 'pending' },
    });
    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'resolved',
      payload: {},
    });

    const events = await listEvents(db, CONV_ID);
    expect(events).toHaveLength(3);
    expect(events[0]!.eventType).toBe('assigned');
    expect(events[1]!.eventType).toBe('status_changed');
    expect(events[2]!.eventType).toBe('resolved');
  });

  it('filters events by type', async () => {
    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'assigned',
      payload: { assigneeId: 'agent-1' },
    });
    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'status_changed',
      payload: { from: 'open', to: 'pending' },
    });
    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'assigned',
      payload: { assigneeId: 'agent-2' },
    });

    const assigned = await getEventsByType(db, CONV_ID, 'assigned');
    expect(assigned).toHaveLength(2);
    expect(assigned.every((e) => e.eventType === 'assigned')).toBe(true);

    const statusChanged = await getEventsByType(db, CONV_ID, 'status_changed');
    expect(statusChanged).toHaveLength(1);
  });

  it('returns empty array for no events', async () => {
    const events = await listEvents(db, CONV_ID);
    expect(events).toEqual([]);
  });

  it('isolates events by conversation', async () => {
    const otherConv = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';

    await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'assigned',
      payload: {},
    });
    await createEvent(db, {
      conversationId: otherConv,
      actorId: ACTOR,
      eventType: 'resolved',
      payload: {},
    });

    const events = await listEvents(db, CONV_ID);
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('assigned');
  });

  it('creates event with default empty payload', async () => {
    const event = await createEvent(db, {
      conversationId: CONV_ID,
      actorId: ACTOR,
      eventType: 'escalated',
    });
    expect(event.payload).toEqual({});
  });
});
