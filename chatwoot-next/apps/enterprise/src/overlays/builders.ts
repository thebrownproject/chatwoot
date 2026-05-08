/**
 * Builder overlays — 3 overrides.
 *
 * Rails source: `enterprise/app/builders/enterprise/`
 */

import type { OverlayRegistry } from '../boot';

export function registerBuilderOverlays(builderRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS builder layer lands.
  builderRegistry.register('AccountBuilder', stub('AccountBuilder'));
  builderRegistry.register('ContactInboxBuilder', stub('ContactInboxBuilder'));
  builderRegistry.register('Messages::MessageBuilder', stub('MessageBuilder'));
}

function stub(label: string) {
  return { __overlay: `enterprise/builders/${label}` };
}
