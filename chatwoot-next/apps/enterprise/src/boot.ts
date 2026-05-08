/**
 * Enterprise overlay boot orchestrator.
 *
 * Replaces the Rails `Module.prepend(InjectEnterpriseEditionModule)` global
 * monkey-patch (see `config/initializers/01_inject_enterprise_edition_module.rb`).
 *
 * In OSS Ruby, every class could opportunistically call `prepend_mod_with(...)`
 * and the initializer would resolve `Enterprise::<ClassName>` from
 * `enterprise/app/...` if present. We replace that ambient lookup with a small
 * set of explicit registries; the OSS code in `packages/*` queries those
 * registries when it needs to honor an override (or when looking up a
 * registered enterprise-only feature).
 */

import { registerPolicyOverlays } from './overlays/policies';
import { registerControllerOverlays } from './overlays/controllers';
import { registerServiceOverlays } from './overlays/services';
import { registerModelOverlays } from './overlays/models';
import { registerJobOverlays } from './overlays/jobs';
import { registerMailerOverlays } from './overlays/mailers';
import { registerBuilderOverlays } from './overlays/builders';
import { registerPresenterOverlays } from './overlays/presenters';
import { registerDispatcherOverlays } from './overlays/dispatchers';
import { registerListenerOverlays } from './overlays/listeners';
import { registerFinderOverlays } from './overlays/finders';
import { registerConcernOverlays } from './overlays/concerns';
import { registerCaptainOverlays } from './overlays/captain';
import { registerSingletonOverlays } from './overlays/singletons';

import { registerEnterpriseJobs } from './jobs';
import { registerEnterpriseFeatures } from './features';

/**
 * The 12 registries that OSS packages expose so enterprise can attach
 * overrides at boot time. Each registry is a plain key/value store; OSS code
 * resolves an override (if present) before instantiating the OSS default.
 */
export interface EnterpriseRegistries {
  policyRegistry: OverlayRegistry;
  controllerRegistry: OverlayRegistry;
  serviceRegistry: OverlayRegistry;
  modelRegistry: StackingOverlayRegistry; // Account stacks 4 overlays
  jobRegistry: OverlayRegistry;
  mailerRegistry: OverlayRegistry;
  builderRegistry: OverlayRegistry;
  presenterRegistry: OverlayRegistry;
  dispatcherRegistry: OverlayRegistry;
  listenerRegistry: OverlayRegistry;
  finderRegistry: OverlayRegistry;
  concernRegistry: OverlayRegistry;
}

export interface OverlayRegistry {
  register(name: string, overlay: unknown): void;
}

/**
 * `with_descendants: true` (e.g. `Captain::BaseTaskService`) requires the
 * registry to apply the overlay to subclasses too. Captain registry uses this.
 * Account also stacks 4 distinct overlays under the same target.
 */
export interface StackingOverlayRegistry extends OverlayRegistry {
  register(name: string, overlay: unknown): void;
  registerStacked?(target: string, overlayName: string, overlay: unknown): void;
  registerForDescendants?(name: string, overlay: unknown): void;
}

export interface EnterpriseEnv {
  EDITION?: string;
  [key: string]: string | undefined;
}

export interface LoadOptions {
  registries: EnterpriseRegistries;
  env: EnterpriseEnv;
}

/**
 * Single boot-time entry point.
 * Called by `apps/web` and `apps/workers` only when `env.EDITION === 'enterprise'`.
 */
export function loadEnterpriseOverlay({ registries, env }: LoadOptions): void {
  // Section 1 — register overlays for OSS extension points
  registerPolicyOverlays(registries.policyRegistry);
  registerControllerOverlays(registries.controllerRegistry);
  registerServiceOverlays(registries.serviceRegistry);
  registerModelOverlays(registries.modelRegistry);
  registerJobOverlays(registries.jobRegistry);
  registerMailerOverlays(registries.mailerRegistry);
  registerBuilderOverlays(registries.builderRegistry);
  registerPresenterOverlays(registries.presenterRegistry);
  registerDispatcherOverlays(registries.dispatcherRegistry);
  registerListenerOverlays(registries.listenerRegistry);
  registerFinderOverlays(registries.finderRegistry);
  registerConcernOverlays(registries.concernRegistry);
  registerCaptainOverlays(registries.serviceRegistry);
  registerSingletonOverlays(registries.serviceRegistry);

  // Section 2 — bring up enterprise-only feature modules and BullMQ handlers
  registerEnterpriseFeatures(env);
  registerEnterpriseJobs(registries.jobRegistry);
}
