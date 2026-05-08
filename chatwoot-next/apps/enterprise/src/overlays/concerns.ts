/**
 * Concern overlays — 3 overrides.
 *
 * Rails source: `enterprise/app/models/concerns/`,
 *               `enterprise/app/controllers/concerns/`
 *
 * Concerns add methods/callbacks to host classes (Ruby `include_mod_with`),
 * unlike most other overlays which override behavior (`prepend_mod_with`).
 */

import type { OverlayRegistry } from '../boot';

export function registerConcernOverlays(concernRegistry: OverlayRegistry): void {
  // TODO: port real concern bodies once the OSS concern layer lands.
  concernRegistry.register('Concerns::Account', stub('Concerns::Account'));
  concernRegistry.register('Audit::Account', stub('Audit::Account'));
  concernRegistry.register('Concerns::Reauthorizable', stub('Concerns::Reauthorizable'));
}

function stub(label: string) {
  return { __overlay: `enterprise/concerns/${label}` };
}
