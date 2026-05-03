# @chatwoot-next/api-public

Independently deployable Next.js app that hosts Chatwoot's cross-domain public surface — the web widget, JS SDK, CSAT surveys, and Help Center portal API. It is intentionally split from the dashboard (`apps/web`) because it has a different CORS surface (open to embedding origins) and a different version cadence (must stay backward compatible with widget script tags pinned in customer pages). All routes authenticate via `publicToken` (the inbox `website_token` or `api_token`, plus portal slugs), never via session cookies.
