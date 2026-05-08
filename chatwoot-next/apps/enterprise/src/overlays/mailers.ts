/**
 * Mailer overlays — 1 override.
 *
 * Rails source: `enterprise/app/mailers/enterprise/`
 */

import type { OverlayRegistry } from '../boot';

export function registerMailerOverlays(mailerRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS mailer layer lands.
  mailerRegistry.register('AgentNotifications::ConversationNotificationsMailer', {
    __overlay: 'enterprise/mailers/AgentNotifications::ConversationNotificationsMailer',
  });
}
