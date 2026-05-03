/**
 * Listener overlays — 1 override.
 *
 * Rails source: `enterprise/app/listeners/enterprise/`
 */

import type { OverlayRegistry } from '../boot';

export function registerListenerOverlays(listenerRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS listener layer lands.
  listenerRegistry.register('NotificationListener', {
    __overlay: 'enterprise/listeners/NotificationListener',
  });
}
