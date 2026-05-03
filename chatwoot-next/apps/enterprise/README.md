# @chatwoot-next/enterprise

Boot-time overlay package for the Chatwoot Enterprise edition. Replaces the
Rails injector at `config/initializers/01_inject_enterprise_edition_module.rb`
(the global `prepend_mod_with` / `include_mod_with` mechanism) with an
explicit, single-entry-point registration scheme: 76 OSS hooks are wired
through 12 registries (policies, controllers, services, models, jobs,
mailers, builders, presenters, dispatchers, listeners, finders, concerns)
plus 9 enterprise-only feature modules (SLA, Captain, SAML, custom roles,
audit log, capacity, voice, companies, page crawler). The package is loaded
by `apps/web` and `apps/workers` only when `EDITION=enterprise`; otherwise
the OSS apps run untouched.
