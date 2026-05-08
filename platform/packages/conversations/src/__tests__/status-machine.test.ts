import { describe, it, expect } from 'vitest';
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
      onUpdate: async () => {},
      onEvent: async () => {},
    });

    expect(result).toEqual({
      ok: false,
      error: 'Invalid transition: resolved → snoozed',
    });
  });

  it('sets snoozedUntil when transitioning to snoozed', async () => {
    let updatedData: unknown = null;
    const snoozeDate = new Date('2026-05-10T09:00:00Z');

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'snoozed',
      snoozedUntil: snoozeDate,
      onUpdate: async (data) => {
        updatedData = data;
      },
      onEvent: async () => {},
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
      onEvent: async () => {},
    });

    expect(updatedData).toEqual({
      status: 'open',
      resolvedAt: null,
      snoozedUntil: null,
    });
  });

  it('uses "reopened" event type when transitioning to open', async () => {
    let eventData: Record<string, unknown> = {};

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'snoozed',
      newStatus: 'open',
      onUpdate: async () => {},
      onEvent: async (event) => {
        eventData = event;
      },
    });

    expect(eventData['eventType']).toBe('reopened');
  });

  it('uses "status_changed" event type for pending transition', async () => {
    let eventData: Record<string, unknown> = {};

    await transitionConversation({
      conversationId: 'conv-1',
      actorId: 'user-1',
      currentStatus: 'open',
      newStatus: 'pending',
      onUpdate: async () => {},
      onEvent: async (event) => {
        eventData = event;
      },
    });

    expect(eventData['eventType']).toBe('status_changed');
  });
});
