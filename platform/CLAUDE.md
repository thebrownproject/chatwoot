# Buildpass Messaging Platform

Agent-native messaging platform for Buildpass. Built from scratch in TypeScript, inspired by Chatwoot.

## Quick Start

```bash
cd platform
pnpm install
pnpm typecheck   # 25 packages, all must pass
pnpm test        # 760+ tests across all packages
```

## Architecture

Conversation-centric with deep modules. See `docs/superpowers/specs/2026-05-08-agent-native-messaging-platform-design.md` for the full spec.

### Packages (under `packages/`)
- **db** — Drizzle ORM schema (14 tables), Neon client, migrations, seed
- **identity** — Clerk auth (humans) + API key auth (agents), user CRUD, contact dedup
- **conversations** — CRUD, status machine (open/pending/snoozed/resolved), messages, labels, canned responses, search, assignment, participants, events
- **channels** — Channel adapter interface, web chat (WebSocket), email (SendGrid/Postmark)
- **routing** — Assignment rules engine, round-robin, teams, snooze scheduler
- **agents** — Agent orchestrator, copilot mode, handoff protocols (agent↔human↔agent)
- **knowledge-base** — Portals, categories, articles, public help center
- **notifications** — Event-driven dispatcher, per-user settings
- **analytics** — Conversation metrics, agent performance, SLA tracking
- **shell** — Inbox UI layout, sidebar, navigation components
- **core** — Cross-module event bus and hooks (auto-reopen, first_reply_at, notifications)

### Apps (under `apps/`)
- **api** — Hono REST server (Fly.io deployment ready)
- **web** — Next.js inbox UI with shadcn/ui
- **realtime** — WebSocket server (stub)
- **widget** — Embeddable chat widget (stub)

## Current State

All modules use **in-memory stores** for data. The Drizzle schema is defined but not wired as the runtime data layer. The Next.js app uses mock data.

## Next Steps (in order)

1. **Set up Neon database** — create project, get connection string
2. **Run migrations** — `packages/db/src/migrate.ts` with Drizzle Kit
3. **Wire Drizzle adapters** — replace in-memory stores in each module's data layer with real Drizzle queries against the db package
4. **Connect API routes** — mount all module routes in `apps/api/src/routes/index.ts` with real DB
5. **Connect Next.js** — replace mock data in `apps/web/src/lib/api.ts` with real Hono API calls
6. **Deploy** — `apps/api/Dockerfile` + `fly.toml` are ready for Fly.io

## Conventions

- TypeScript strict, `"type": "module"` everywhere
- Drizzle ORM for schema (pgTable, pgEnum)
- Hono for HTTP routing
- Vitest for testing
- Package scope: `@buildpass/<name>`
- Module structure: `data/`, `routes/`, `actions/`, `types.ts`, `manifest.ts`
- All data functions take `db` as first parameter (dependency injection)
- Every state change creates a ConversationEvent (audit trail)
- Tailwind only for styling (no custom CSS)
- Security: scrypt for API keys, timingSafeEqual everywhere, HTML sanitization on inbound email

## Key Design Decisions

See `docs/decisions.md` for the full register. Highlights:
- Single User table for humans and agents (type discriminator)
- Participant role `contact` (not `owner` — avoids support terminology confusion)
- Presence in Redis, not Postgres (ephemeral state)
- Neon over Supabase (Clerk handles auth)
- MVP = standard inbox first, agent features Phase 2
