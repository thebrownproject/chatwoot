/**
 * Presenter overlays — 1 override.
 *
 * Rails source: `enterprise/app/presenters/enterprise/`
 */

import type { OverlayRegistry } from '../boot';

export function registerPresenterOverlays(presenterRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS presenter layer lands.
  presenterRegistry.register('Conversations::EventDataPresenter', {
    __overlay: 'enterprise/presenters/Conversations::EventDataPresenter',
  });
}
