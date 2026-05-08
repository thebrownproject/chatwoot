# Integration Readiness Checklist

From Opus 4.7 analysis of the current codebase. **~14 tasks, ~8 agent sessions** to go from in-memory to production.

## Phase A: Foundation (do first, 1 session)
- [ ] Add missing schema tables to `@buildpass/db`: notifications (notifications, notification_settings), knowledge-base (portals, categories, articles)
- [ ] Run `drizzle-kit generate` to create initial migration SQL from the complete schema
- [ ] Set up Neon project + get `DATABASE_URL`, configure `.env`
- [ ] Run migrations against Neon using `packages/db/src/migrate.ts`

## Phase B: Drizzle adapters per module (parallel, 1 agent each)
- [ ] **identity** (10 functions): Write Drizzle `UserDb`/`PermissionDb` adapter
- [ ] **conversations** (44 functions): Replace in-memory Maps with Drizzle queries. Split: CRUD (11), messages (4), labels (6), canned-responses (6), assignment (5), participants (6), events (3), status-machine (3)
- [ ] **channels** (6 functions): Replace in-memory Map with Drizzle
- [ ] **routing** (13 functions): Write Drizzle `RoutingDb` adapter + move round-robin to Redis
- [ ] **agents** (5 functions): Replace in-memory Maps with Drizzle
- [ ] **knowledge-base** (25 functions): Replace in-memory Maps with Drizzle
- [ ] **notifications** (8 functions): Replace raw SQL `query()` with Drizzle
- [ ] **analytics** (6 functions): Replace raw SQL `MetricsDb`/`SlaDb` with Drizzle aggregation

## Phase C: Wire and verify (1 session)
- [ ] Mount all module routes in `apps/api/src/routes/index.ts` with real Drizzle db
- [ ] Connect Next.js to real API (replace `mock-data.ts`)
- [ ] Run seed against Neon
- [ ] Verify: `pnpm dev` — API serves real data, inbox UI renders it
- [ ] Deploy to Fly.io
