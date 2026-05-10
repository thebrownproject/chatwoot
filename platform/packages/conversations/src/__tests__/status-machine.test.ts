import { describe, it, expect, vi } from 'vitest';
import {
  validateTransition,
  allowedTransitions,
  transitionConversation,
} from '../data/status-machine.js';
import type { ConversationStatus } from '../types.js';

describe('validateTransition', () => {
  const validCases: [ConversationStatus, ConversationStatus][] = [
    ['open', 'pending'],
    ['open', 'snoozed'],
    ['open', 'resolved'],
    ['pending', 'open'],
    ['pending', 'snoozed'],
    ['pending', 'resolved'],
    ['snoozed', 'open'],
    ['resolved', 'open'],
  ];

  it.each(validCases)('allows %s -> %s', (from, to) => {
    expect(validateTransition(from, to)).toBe(true);
  });

  const invalidCases: [ConversationStatus, ConversationStatus][] = [
    ['open', 'open'],
    ['snoozed', 'resolved'],
    ['snoozed', 'pending'],
    ['resolved', 'pending'],
    ['resolved', 'snoozed'],
    ['resolved', 'resolved'],
    ['snoozed', 'snoozed'],
    ['pending', 'pending'],
  ];

  it.each(invalidCases)('rejects %s -> %s', (from, to) => {
    expect(validateTransition(from, to)).toBe(false);
  });
});

describe('allowedTransitions', () => {
  it('returns correct transitions from open', () => {
    const result = allowedTransitions('open');
    expect(result).toContain('pending');
    expect(result).toContain('snoozed');
    expect(result).toContain('resolved');
    expect(result).toHaveLength(3);
  });

  it('returns correct transitions from pending', () => {
    const result = allowedTransitions('pending');
    expect(result).toContain('open');
    expect(result).toContain('snoozed');
    expect(result).toContain('resolved');
    expect(result).toHaveLength(3);
  });

  it('returns only open from snoozed', () => {
    expect(allowedTransitions('snoozed')).toEqual(['open']);
  });

  it('returns only open from resolved', () => {
    expect(allowedTransitions('resolved')).toEqual(['open']);
  });
});

describe('transitionConversation', () => {
  const noopUpdate = async () => {};
  const noopEvent = async () => {};

  it('executes a valid transition and calls callbacks', async () => {
    let updatedData: unknown = null;
    let eventData: unknown = null;

    const result = await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'resolved',
      onUpdate: async (data) => {
        updatedData = data;
      },
      onEvent: async (event) => {
        eventData = event;
      },
    });

    expect(result).toEqual({ ok: true, transition: { from: 'open', to: 'resolved' } });
    expect(updatedData).toEqual({
      status: 'resolved',
      resolvedAt: expect.any(Date),
      snoozedUntil: null,
    });
    expect(eventData).toEqual({
      conversationId: 'conv-1',
      actorId: 'user-1',
      eventType: 'resolved',
      payload: { from: 'open', to: 'resolved' },
    });
  });

  it('rejects an invalid transition', async () => {
    const result = await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'resolved',
      newStatus: 'snoozed',
      snoozedUntil: new Date(Date.now() + 60_000),
      onUpdate: noopUpdate,
      onEvent: noopEvent,
    });

    expect(result).toEqual({
      ok: false,
      error: 'Invalid transition: resolved → snoozed',
    });
  });

  it('sets snoozedUntil when transitioning to snoozed', async () => {
    let updatedData: unknown = null;
    const snoozeDate = new Date(Date.now() + 3_600_000);

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'snoozed',
      snoozedUntil: snoozeDate,
      onUpdate: async (data) => {
        updatedData = data;
      },
      onEvent: noopEvent,
    });

    expect(updatedData).toEqual({
      status: 'snoozed',
      resolvedAt: null,
      snoozedUntil: snoozeDate,
    });
  });

  it('clears resolvedAt and snoozedUntil when reopening', async () => {
    let updatedData: unknown = null;

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'resolved',
      newStatus: 'open',
      onUpdate: async (data) => {
        updatedData = data;
      },
      onEvent: noopEvent,
    });

    expect(updatedData).toEqual({
      status: 'open',
      resolvedAt: null,
      snoozedUntil: null,
    });
  });

  it('uses "reopened" event type when reopening from resolved', async () => {
    let eventData: Record<string, unknown> = {};

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'resolved',
      newStatus: 'open',
      onUpdate: noopUpdate,
      onEvent: async (event) => {
        eventData = event;
      },
    });

    expect(eventData['eventType']).toBe('reopened');
  });

  it('uses "unsnoozed" event type when opening from snoozed', async () => {
    let eventData: Record<string, unknown> = {};

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'snoozed',
      newStatus: 'open',
      onUpdate: noopUpdate,
      onEvent: async (event) => {
        eventData = event;
      },
    });

    expect(eventData['eventType']).toBe('unsnoozed');
  });

  it('uses "status_changed" event type for pending transition', async () => {
    let eventData: Record<string, unknown> = {};

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'pending',
      onUpdate: noopUpdate,
      onEvent: async (event) => {
        eventData = event;
      },
    });

    expect(eventData['eventType']).toBe('status_changed');
  });

  it('rejects snooze without snoozedUntil date', async () => {
    const result = await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'snoozed',
      onUpdate: noopUpdate,
      onEvent: noopEvent,
    });

    expect(result).toEqual({
      ok: false,
      error: 'snoozedUntil is required when transitioning to snoozed',
    });
  });

  it('rejects snooze with past date', async () => {
    const result = await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'snoozed',
      snoozedUntil: new Date('2020-01-01T00:00:00Z'),
      onUpdate: noopUpdate,
      onEvent: noopEvent,
    });

    expect(result).toEqual({
      ok: false,
      error: 'snoozedUntil must be in the future',
    });
  });

  it('does not call onUpdate or onEvent on invalid transition', async () => {
    const onUpdate = vi.fn();
    const onEvent = vi.fn();

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'resolved',
      newStatus: 'pending',
      onUpdate,
      onEvent,
    });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('propagates onUpdate errors without calling onEvent', async () => {
    const onEvent = vi.fn();

    await expect(
      transitionConversation({
        conversationId: 'conv-1',
        actorId: 'user-1',
        currentStatus: 'open',
        newStatus: 'resolved',
        onUpdate: async () => {
          throw new Error('DB write failed');
        },
        onEvent,
      }),
    ).rejects.toThrow('DB write failed');

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('propagates onEvent errors after onUpdate succeeds', async () => {
    const onUpdate = vi.fn();

    await expect(
      transitionConversation({
        conversationId: 'conv-1',
        actorId: 'user-1',
        currentStatus: 'open',
        newStatus: 'resolved',
        onUpdate,
        onEvent: async () => {
          throw new Error('Event write failed');
        },
      }),
    ).rejects.toThrow('Event write failed');

    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('resolvedAt is a Date close to now when resolving', async () => {
    let resolvedAt: Date | null = null;
    const before = new Date();

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'resolved',
      onUpdate: async (data) => {
        resolvedAt = data.resolvedAt;
      },
      onEvent: noopEvent,
    });

    const after = new Date();
    expect(resolvedAt).toBeInstanceOf(Date);
    expect((resolvedAt as unknown as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect((resolvedAt as unknown as Date).getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
