import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../event-bus.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('emits events to registered handlers', async () => {
    const received: unknown[] = [];

    bus.on('message.created', async (data) => {
      received.push(data);
    });

    const payload = {
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        visibility: 'public' as const,
      },
      conversation: {
        id: 'conv-1',
        status: 'open' as const,
        assigneeId: null,
        firstReplyAt: null,
      },
    };

    await bus.emit('message.created', payload);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(payload);
  });

  it('supports multiple handlers for the same event', async () => {
    let callCount = 0;

    bus.on('conversation.assigned', async () => { callCount++; });
    bus.on('conversation.assigned', async () => { callCount++; });

    await bus.emit('conversation.assigned', {
      conversationId: 'conv-1',
      assigneeId: 'user-1',
    });

    expect(callCount).toBe(2);
  });

  it('runs handlers sequentially in registration order', async () => {
    const order: number[] = [];

    bus.on('conversation.event', async () => { order.push(1); });
    bus.on('conversation.event', async () => { order.push(2); });
    bus.on('conversation.event', async () => { order.push(3); });

    await bus.emit('conversation.event', {
      event: {
        id: 'evt-1',
        conversationId: 'conv-1',
        actorId: 'user-1',
        eventType: 'status_changed',
        payload: {},
      },
    });

    expect(order).toEqual([1, 2, 3]);
  });

  it('does nothing when emitting with no handlers', async () => {
    // Should not throw
    await bus.emit('conversation.resolved', {
      conversationId: 'conv-1',
      actorId: 'user-1',
    });
  });

  it('removes a handler with off()', async () => {
    let callCount = 0;
    const handler = async () => { callCount++; };

    bus.on('conversation.reopened', handler);
    await bus.emit('conversation.reopened', { conversationId: 'conv-1', actorId: 'user-1' });
    expect(callCount).toBe(1);

    bus.off('conversation.reopened', handler);
    await bus.emit('conversation.reopened', { conversationId: 'conv-1', actorId: 'user-1' });
    expect(callCount).toBe(1); // Not called again
  });

  it('clears all handlers', async () => {
    let callCount = 0;

    bus.on('message.created', async () => { callCount++; });
    bus.on('conversation.assigned', async () => { callCount++; });

    bus.clear();

    await bus.emit('message.created', {
      message: { id: 'msg-1', conversationId: 'conv-1', senderId: 'u-1', visibility: 'public' },
      conversation: { id: 'conv-1', status: 'open', assigneeId: null, firstReplyAt: null },
    });
    await bus.emit('conversation.assigned', { conversationId: 'conv-1', assigneeId: 'u-1' });

    expect(callCount).toBe(0);
  });
});
