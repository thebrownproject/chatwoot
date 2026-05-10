# Platform Status

**State:** Active
**Last session:** 2026-05-11
**PRs merged:** 101 (124 total, including Codex QA)
**Production path:** buildpass-ops module (`src/modules/messaging/`)
**Test suite:** 891+ unit tests + 135 e2e tests (all passing)

## Current Focus

Phase B: Wire Drizzle adapters to replace in-memory stores. Codebase fully swept and hardened (Wave 1 + Wave 2 = 34 Opus 4.7 agent passes, ~240 issues fixed, ~335 tests added). The `isDrizzleDb` pattern is eliminated — all modules now use the clean Db adapter interface. DOMPurify, auth context, WS auth, response shapes all production-ready. See `docs/integration-checklist.md` for the complete Phase B/C plan.

## Sprint

### Phase A: Design + Build (COMPLETE)
- [x] Architecture design + spec + Opus 4.7 review
- [x] Monorepo scaffold (pnpm + Turbo)
- [x] DB schema (21 tables, Drizzle ORM, types, seed, cleanDb, adapter factory)
- [x] Identity module (Clerk + scrypt API keys, camelCase types)
- [x] Conversations module (CRUD, status machine, messages, assignment, labels, search, guards)
- [x] Channels module (web chat WebSocket + email threading + HTML sanitization)
- [x] Routing module (word-boundary keywords, round-robin, teams, snooze scheduler)
- [x] Agents module (orchestrator, copilot, self-handoff prevention)
- [x] Knowledge base module (portals, categories with cycle detection, articles with status transitions, slug uniqueness)
- [x] Notifications module (Promise.allSettled dispatcher, participant_joined handling)
- [x] Analytics module (metrics, SLA tracking, date validation)
- [x] Shell module (inbox UI components, ESM compliant)
- [x] Core module (error-isolated event bus, cross-module hooks, shared utils, smart error middleware)
- [x] API server (Hono + rate limiter + request ID + error handler)
- [x] Web app (Next.js inbox UI + error boundary + loading + 404 + Node 25 fix)
- [x] E2E test suite (92 tests + 610 unit tests)
- [x] Security hardening (30+ fixes)
- [x] Quality sweep (30+ Opus 4.7 passes)
- [x] Integration checklist + continuous improvement loop doc
- [x] Opus 4.7 codebase sweep Wave 1 (24 targets, 211 issues, 315 tests)
- [x] Opus 4.7 codebase sweep Wave 2 (10 cross-cutting fixes, DOMPurify, auth, isDrizzleDb elimination)

### Phase B: Drizzle Wiring (NEXT)
- [ ] Set up Neon database
- [ ] Run drizzle-kit generate + migrations
- [ ] Wire identity Drizzle adapter
- [ ] Wire conversations Drizzle adapter (44 functions — biggest task)
- [ ] Wire channels Drizzle adapter
- [ ] Wire routing Drizzle adapter + Redis round-robin
- [ ] Wire agents Drizzle adapter
- [ ] Wire knowledge-base Drizzle adapter
- [ ] Wire notifications Drizzle adapter
- [ ] Wire analytics Drizzle adapter

### Phase C: Integration + Deploy
- [ ] Mount all routes in API server with real DB
- [ ] Connect Next.js to real API (replace mock data)
- [ ] Wire event bus emissions (5 connection points)
- [ ] Configure Clerk auth end-to-end
- [ ] Deploy to Fly.io
- [ ] Build embeddable widget

## Blockers

- Neon database setup (needs Fraser to provision)
- Widget visitor token design decision
- UI design review (current scaffold is basic)

## Key Docs

- `platform/CLAUDE.md` — builder onboarding
- `platform/docs/opus-sweep.md` — Wave 1 sweep results (24 targets, full details)
- `platform/docs/opus-sweep-2.md` — Wave 2 sweep results (10 targets, full details)
- `docs/integration-checklist.md` — Phase B/C plan with race conditions + wiring points
- `docs/continuous-improvement-loop.md` — how the autonomous loop works
- `docs/state-summary.md` — complete platform inventory
- `docs/decisions.md` — architectural decision register
- `platform/.env.example` — required environment variables
