import { policyRegistry, PolicyRegistry } from '@chatwoot-next/policies';
import { listenerRegistry, ListenerRegistry } from './events/listeners.js';

// Re-export the policy registry for convenience so consumers can grab both
// registries from `@chatwoot-next/core` without reaching into `@policies`.
export { policyRegistry } from '@chatwoot-next/policies';
export { listenerRegistry } from './events/listeners.js';

/**
 * Top-level aggregator. Boot code (apps/api, apps/workers, apps/realtime)
 * imports `registries` and registers everything — policies, listeners — in
 * one place per app.
 */
export const registries: {
  policy: PolicyRegistry;
  listener: ListenerRegistry;
} = {
  policy: policyRegistry,
  listener: listenerRegistry,
};
