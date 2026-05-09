# Platform Status

**State:** Active
**Last session:** 2026-05-10
**PRs merged:** 101 (124 total, including Codex QA)
**Production path:** buildpass-ops module (`src/modules/messaging/`)

## Current Focus

Phase B: Wire Drizzle adapters to replace in-memory stores. All modules built, tested (610 cases), security hardened, and reviewed (30+ Opus 4.7 passes). See `docs/integration-checklist.md` for the complete Phase B/C plan.

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
- `docs/integration-checklist.md` — Phase B/C plan with race conditions + wiring points
- `docs/continuous-improvement-loop.md` — how the autonomous loop works
- `docs/state-summary.md` — complete platform inventory
- `docs/decisions.md` — architectural decision register
- `platform/.env.example` — required environment variables
