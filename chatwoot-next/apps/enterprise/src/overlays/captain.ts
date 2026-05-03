/**
 * Captain (lib/captain) overlays — 3 overrides.
 *
 * Rails source: `enterprise/lib/captain/`, `enterprise/app/services/captain/`
 *
 * SPECIAL CASE — `with_descendants: true`
 *   `lib/captain/base_task_service.rb` line 19 declares
 *     `prepend_mod_with('Captain::BaseTaskService', with_descendants: true)`
 *   and line 211 reapplies the overlay to every descendant of
 *   `Captain::BaseTaskService` so subclasses (LlmTask, ConversationTask, ...)
 *   inherit the enterprise override automatically.
 *
 *   The TS registry must mimic this. Two viable approaches:
 *     1. A `registerForDescendants` registry method that walks an OSS-side
 *        subclass map (registered by each Captain subclass at module load).
 *     2. A class decorator on the base class that wraps subclasses on
 *        construction, applying the enterprise overlay before they boot.
 *   TODO: pick one once the Captain OSS package surface is finalized.
 */

import type { OverlayRegistry } from '../boot';

export function registerCaptainOverlays(serviceRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS captain layer lands.

  // SPECIAL — propagates to every Captain::BaseTaskService subclass.
  // If serviceRegistry exposes registerForDescendants, prefer that.
  type DescendantCapable = OverlayRegistry & {
    registerForDescendants?(name: string, overlay: unknown): void;
  };
  const reg = serviceRegistry as DescendantCapable;

  if (typeof reg.registerForDescendants === 'function') {
    reg.registerForDescendants('Captain::BaseTaskService', stub('BaseTaskService'));
  } else {
    // Fallback to plain registration; OSS-side resolver must walk descendants.
    serviceRegistry.register('Captain::BaseTaskService', stub('BaseTaskService'));
  }

  serviceRegistry.register('Captain::Llm::BaseOpenAiService', stub('BaseOpenAiService'));
  serviceRegistry.register('Captain::Tools::SimpleToolExecutorService', stub('SimpleToolExecutorService'));
}

function stub(label: string) {
  return { __overlay: `enterprise/captain/${label}` };
}
