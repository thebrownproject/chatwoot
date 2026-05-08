/**
 * Stub event types for widget <-> api-public.
 *
 * Source contract: `app/javascript/shared/helpers/BaseActionCableConnector.js`
 * (the `received({ event, data })` payload shape, plus per-event handlers in
 * `app/javascript/widget/helpers/actionCable.js` and
 * `app/javascript/dashboard/helper/actionCable.js`).
 *
 * TODO: tighten payloads against the real RoomChannel broadcasts.
 */

import type { PublicApiContact, PublicApiConversation, PublicApiMessage } from './api';

export type WidgetEvent =
  | {
      type: 'message:created';
      payload: PublicApiMessage;
    }
  | {
      type: 'message:updated';
      payload: PublicApiMessage;
    }
  | {
      type: 'conversation:created';
      payload: PublicApiConversation;
    }
  | {
      type: 'conversation:status_changed';
      payload: Pick<PublicApiConversation, 'id' | 'status'>;
    }
  | {
      type: 'agent:typing';
      payload: {
        conversation: Pick<PublicApiConversation, 'id'>;
        user: Pick<PublicApiContact, 'id' | 'name'>;
        is_typing: boolean;
      };
    }
  | {
      type: 'presence:update';
      payload: {
        contacts: Record<string, 'online' | 'offline' | 'busy'>;
        users: Record<string, 'online' | 'offline' | 'busy'>;
      };
    };

export type WidgetEventType = WidgetEvent['type'];
