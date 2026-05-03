/**
 * Finder overlays — 2 overrides.
 *
 * Rails source: `enterprise/app/finders/enterprise/`
 */

import type { OverlayRegistry } from '../boot';

export function registerFinderOverlays(finderRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS finder layer lands.
  finderRegistry.register('ConversationFinder', stub('ConversationFinder'));
  finderRegistry.register('ReportingEventFilter', stub('ReportingEventFilter'));
}

function stub(label: string) {
  return { __overlay: `enterprise/finders/${label}` };
}
