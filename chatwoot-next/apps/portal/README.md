# @chatwoot-next/portal

Public-facing help center. Next.js App Router with ISR (`revalidate = 3600`) so search engines see fully rendered HTML and edits propagate via on-demand revalidation. Routes mirror the Rails public API: `[portalSlug]`, `[portalSlug]/[locale]/categories/[categorySlug]`, `[portalSlug]/[locale]/articles/[articleSlug]`. Replaces `app/javascript/portal/`. Rails source: `Portal`, `Category`, and `Article` models plus `Public::Api::V1::Portals::*` controllers (`config/routes.rb`).
