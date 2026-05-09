# Platform State Summary

*Updated 2026-05-09 ~12:00 AEST — 13 hours, 100 PRs merged, 30+ Opus 4.7 passes*

## What exists (11 packages, 4 apps, 30k lines)
- **db** — 21 Drizzle tables (with timestamps + relations), types, migrations, seed, cleanDb, adapter factory
- **identity** — Clerk JWT + scrypt API keys, user CRUD, contact dedup (case-insensitive), presence (Redis)
- **conversations** — CRUD, status machine, messages (empty body guard), labels, canned responses (empty guard), tsvector search, assignment (auth context), participants (contact removal guard), events audit log
- **channels** — Adapter interface + registry, web chat (WebSocket + connection manager), email (threading with stacked prefix stripping + HTML sanitization)
- **routing** — Rule evaluator (word-boundary keywords, cached regex, deterministic tie-breaking), round-robin (clamped index), teams (deletion guard against active rules), snooze scheduler (with audit events)
- **agents** — Orchestrator, copilot suggestions (dismiss-then-accept guard), 3-way handoff (self-handoff prevention), agent config
- **knowledge-base** — Portals, hierarchical categories (circular parent prevention, deletion guard), articles (unique slugs per portal, status transitions draft→published→archived, non-Latin fallback), public routes (sanitized — no internal IDs)
- **notifications** — Event-driven dispatcher (Promise.allSettled, handles assigned/unassigned/participant_joined/reopened/snoozed/escalated), per-user settings
- **analytics** — Conversation/agent/team/channel metrics, SLA breach detection, date validation
- **shell** — AppLayout, Sidebar, Header, module registry, type mappers, ESM-compliant imports
- **core** — Typed event bus (error-isolated), cross-module hooks (each step independent try/catch), shared utils (generateId, zUuid, zPagination, zSearchQuery, jsonError, parseUuidParam, isValidUuid), smart error middleware

## What works right now
- `pnpm install && pnpm typecheck && pnpm test` → 36/36 turbo tasks, 610+ test cases
- `pnpm build` → 14/14 build tasks (Next.js compiles clean)
- API server starts, responds to health/docs, generates request IDs, rate limits
- Next.js builds with error boundary, loading spinner, 404 page
- Pre-flight: 10/10 ready for Drizzle wiring

## What's next
1. Set up Neon + `drizzle-kit generate` + run migrations
2. Wire Drizzle adapters (~8 sessions, see `docs/integration-checklist.md`)
3. Connect modules (5 wiring points documented)
4. Deploy to Fly.io

## Known remaining items (need Fraser)
- Widget visitor token system (security)
- Agent orchestrator bypasses cross-module hooks (Phase B fix)
