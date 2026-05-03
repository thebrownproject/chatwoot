/**
 * Enterprise-only feature modules.
 *
 * These are pure additions — they don't pass through the registries
 * (those exist solely to override OSS code). They're surfaced here so the
 * boot orchestrator can initialize them, and so OSS apps can import them
 * conditionally when `EDITION=enterprise`.
 */

import type { EnterpriseEnv } from '../boot';

export * as sla from './sla';
export * as captain from './captain';
export * as saml from './saml';
export * as customRoles from './custom-roles';
export * as auditLog from './audit-log';
export * as capacity from './capacity';
export * as voice from './voice';
export * as companies from './companies';
export * as pageCrawler from './page-crawler';

/**
 * Called by the boot orchestrator to give each feature module a chance to
 * wire up listeners, warm caches, etc. Today this is a no-op; modules
 * register lazily on first call.
 */
export function registerEnterpriseFeatures(_env: EnterpriseEnv): void {
  // TODO: invoke per-feature `init(env)` once any feature needs eager setup.
}
