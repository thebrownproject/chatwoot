/**
 * Dispatcher overlays — 1 override.
 *
 * Rails source: `enterprise/app/dispatchers/enterprise/`
 */

import type { OverlayRegistry } from '../boot';

export function registerDispatcherOverlays(dispatcherRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS dispatcher layer lands.
  dispatcherRegistry.register('Dispatcher', {
    __overlay: 'enterprise/dispatchers/Dispatcher',
  });
}
