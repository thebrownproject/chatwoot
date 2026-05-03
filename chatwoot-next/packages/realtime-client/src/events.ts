/**
 * Realtime event names shared between `apps/realtime` (publisher) and
 * browser consumers (Vue dashboard, React next, widget, sdk).
 *
 * Source: `app/javascript/shared/helpers/BaseActionCableConnector.js` plus
 * the per-app event registries in
 * `app/javascript/dashboard/helper/actionCable.js` and
 * `app/javascript/widget/helpers/actionCable.js`. Names are kept identical
 * so Vue and React can co-consume during cutover.
 */

export const REALTIME_EVENTS = {
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_STATUS_CHANGED: 'conversation.status_changed',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  PRESENCE_UPDATE: 'presence.update',
  TYPING_ON: 'typing.on',
  TYPING_OFF: 'typing.off',
  NOTIFICATION_CREATED: 'notification.created',
  ACCOUNT_CACHE_INVALIDATED: 'account.cache_invalidated',
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export type RealtimeEvent =
  | { event: 'conversation.created'; data: Record<string, unknown> }
  | { event: 'conversation.updated'; data: Record<string, unknown> }
  | {
      event: 'conversation.status_changed';
      data: { id: number; status: string };
    }
  | { event: 'message.created'; data: Record<string, unknown> }
  | { event: 'message.updated'; data: Record<string, unknown> }
  | {
      event: 'presence.update';
      data: {
        contacts: Record<string, string>;
        users: Record<string, string>;
      };
    }
  | {
      event: 'typing.on';
      data: { conversation: { id: number }; user: { id: number } };
    }
  | {
      event: 'typing.off';
      data: { conversation: { id: number }; user: { id: number } };
    }
  | { event: 'notification.created'; data: Record<string, unknown> }
  | {
      event: 'account.cache_invalidated';
      data: { cache_keys: Record<string, string> };
    };
