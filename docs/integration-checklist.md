# Integration Readiness Checklist

From Opus 4.7 analysis of the current codebase. **~14 tasks, ~8 agent sessions** to go from in-memory to production.

## CRITICAL: End-to-end message flow is NOT connected (2/8 steps work)

Opus 4.7 traced a customer message through all modules. Result: **modules are islands**. The widget has its own in-memory store separate from conversations. No code triggers routing on conversation creation. The event bus has handlers but nobody emits events. The WebSocket server isn't wired to widget message creation.

What needs wiring in Phase C:
1. Widget → conversations module (use `createConversation` + `createMessage`, not local store)
2. Conversation creation → routing evaluator (trigger `evaluate()` on new conversations)
3. Message creation → `eventBus.emit('message.created')` (trigger hooks)
4. Assignment → `eventBus.emit('conversation.assigned')` (trigger agent orchestrator)
5. Message creation → WebSocket broadcast (notify connected agents)

## CRITICAL: E2E test suite partially tests reimplementations

The E2E test suite (`tests/e2e/setup.ts`) imports REAL code from conversations, agents, KB, and routing modules. But it REIMPLEMENTS identity, notifications, and analytics with local in-memory stores. **If those 3 modules' code were deleted, all 92 E2E tests would still pass.** When wiring Drizzle, the E2E setup should be updated to import from the real modules instead of reimplementing them.

## CRITICAL: snake_case → camelCase type mismatch

The identity module's `User` type uses `snake_case` fields (`avatar_url`, `clerk_id`, `api_key_hash`). Drizzle returns `camelCase` (`avatarUrl`, `clerkId`, `apiKeyHash`). When Drizzle adapters are wired, **every identity API response will break**. The `sanitizeUser` function destructures by snake_case names. Fix: update identity types to camelCase BEFORE wiring Drizzle adapters.

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
