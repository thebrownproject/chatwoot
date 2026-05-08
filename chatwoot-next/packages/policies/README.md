# @chatwoot-next/policies

A Pundit-equivalent authorization framework in TypeScript: `definePolicy` builds a record/action policy with `.can()` and `.authorize()` semantics, and a process-wide `policyRegistry` provides a registry-hook pattern that lets the Enterprise package overlay (register or replace) policies at boot, while OSS code resolves policies by name without knowing whether an Enterprise override is present. Domain policies (conversation, contact, inbox, etc.) live in `@chatwoot-next/core`, not here — this package only provides the framework.
