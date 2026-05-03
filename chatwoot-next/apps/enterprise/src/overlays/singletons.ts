/**
 * Singleton-class overlays.
 *
 * Rails source: `lib/chatwoot_hub.rb:133`
 *   `ChatwootHub.singleton_class.prepend_mod_with('ChatwootHub')`
 *
 * SPECIAL CASE — singleton-class hook
 *   In Ruby this overrides class-level methods (the metaclass), not instance
 *   methods. In TS we'd express this by replacing static methods on a class
 *   or wrapping a module's exported functions. Since `ChatwootHub` is module-
 *   level glue (telemetry/cloud reporting), the cleanest TS analogue is
 *   to register an overlay that swaps the module's exported function table
 *   at boot.
 *
 *   TODO: settle on the static-method override mechanism once `ChatwootHub`
 *   is ported to TS. For now we register the overlay against the service
 *   registry under a reserved `static:` prefix so OSS code can detect that
 *   the override targets the static surface, not an instance.
 */

import type { OverlayRegistry } from '../boot';

export function registerSingletonOverlays(serviceRegistry: OverlayRegistry): void {
  serviceRegistry.register('static:ChatwootHub', {
    __overlay: 'enterprise/singletons/ChatwootHub',
  });
}
