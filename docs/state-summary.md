# Platform State Summary

*Generated 2026-05-09 ~07:30 AEST after overnight build session (49 PRs, 17 Opus 4.7 passes)*

## What exists (11 packages, 4 apps)
- **db** — 21 Drizzle tables, types, migrations, seed, cleanDb, adapter factory
- **identity** — Clerk JWT + scrypt API keys, user CRUD, contact dedup, presence (Redis)
- **conversations** — CRUD, status machine, messages, labels, canned responses, tsvector search, assignment, participants, events audit log
- **channels** — Adapter interface, web chat (WebSocket + connection manager), email (threading + webhook + HTML sanitization)
- **routing** — Rule evaluator (word-boundary keywords), round-robin, teams, snooze scheduler
- **agents** — Orchestrator, copilot suggestions, 3-way handoff protocol
- **knowledge-base** — Portals, hierarchical categories, articles with publish lifecycle + search
- **notifications** — Event-driven dispatcher (Promise.allSettled), per-user settings
- **analytics** — Conversation/agent/team/channel metrics, SLA breach detection
- **shell** — AppLayout, Sidebar, Header, module registry, type mappers
- **core** — Typed event bus (error-isolated), cross-module hooks, shared utils

## What works right now
`pnpm install && pnpm typecheck && pnpm test` — 36/36 turbo tasks green, 760+ tests pass. All business logic works against in-memory stores. E2E suite (92 tests) validates full lifecycle.

## What's next (3 most impactful)
1. **Set up Neon + run migrations** — unlocks everything else
2. **Write Drizzle adapters** for conversations (44 functions), then identity + routing
3. **Mount real routes + connect Next.js** — first time real data flows

## Known deferred issues (top 5)
1. Widget conversation IDs enumerable without visitor tokens
2. Snooze scheduler bypasses conversation module (no audit event)
3. KB article slugs not unique per portal
4. Category hierarchy allows circular parent references
5. Agent orchestrator bypasses cross-module hooks

## Estimated effort to working demo
~8 agent sessions (6 adapter sessions parallel, 1 wiring, 1 deploy)
