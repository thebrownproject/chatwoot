# Platform Status

**State:** Active
**Last session:** 2026-05-09

## Current Focus

Wire platform to real database and deploy. All modules are built and tested with in-memory stores — next step is connecting to Neon Postgres via Drizzle adapters, then deploying to Fly.io.

## Sprint

- [x] Architecture design + spec
- [x] Opus 4.7 spec review
- [x] Monorepo scaffold (pnpm + Turbo)
- [x] DB schema (14 tables, Drizzle ORM)
- [x] Identity module (Clerk + API key auth)
- [x] Conversations module (CRUD, status machine, messages, assignment, labels, search)
- [x] Channels module (web chat WebSocket + email adapter)
- [x] Routing module (rules engine, round-robin, snooze scheduler)
- [x] Agents module (orchestrator, copilot, handoffs)
- [x] Knowledge base module (portals, categories, articles)
- [x] Notifications module (dispatcher, settings)
- [x] Analytics module (metrics, SLA tracking)
- [x] Shell module (inbox UI components)
- [x] Core module (event bus, cross-module hooks)
- [x] API server (Hono + middleware)
- [x] Web app (Next.js inbox UI)
- [x] E2E test suite (92 tests)
- [x] Security hardening
- [x] Quality sweep (3 Opus 4.7 passes)
- [ ] Neon database setup + migrations
- [ ] Drizzle adapter wiring (replace in-memory)
- [ ] Connect Next.js to real API
- [ ] Clerk auth end-to-end
- [ ] Fly.io deployment
- [ ] Embeddable widget

## Blockers

- None (all blocking decisions made)
