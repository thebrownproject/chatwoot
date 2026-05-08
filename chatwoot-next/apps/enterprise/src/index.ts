/**
 * @chatwoot-next/enterprise
 *
 * Boot-time overlay package — replaces Rails' `prepend_mod_with` /
 * `include_mod_with` mechanism (originally defined in
 * `config/initializers/01_inject_enterprise_edition_module.rb`).
 *
 * The OSS apps (`apps/web`, `apps/workers`) call `loadEnterpriseOverlay`
 * exactly once during boot when `EDITION=enterprise`. Everything outside
 * that single call site MUST remain edition-agnostic.
 */

export { loadEnterpriseOverlay } from './boot';
export type { EnterpriseRegistries, EnterpriseEnv, LoadOptions } from './boot';
export * as features from './features';
