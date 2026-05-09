# Handover Log

## [2026-05-09] -- 14-hour marathon: built entire platform, 100 PRs, 30+ Opus 4.7 passes

**Duration:** ~14 hours (23:00 May 8 → 13:00 May 9 AEST)

**What got built (from zero to 30k lines):**
- Brainstormed architecture with Fraser → conversation-centric, agent-native design
- Wrote architecture spec, got Opus 4.7 review, incorporated feedback
- Built 11 packages from scratch: db (21 Drizzle tables), identity (Clerk + scrypt), conversations (CRUD + status machine + messages + assignment + labels + canned responses), channels (WebSocket + email threading), routing (rules engine + round-robin + snooze), agents (orchestrator + copilot + handoffs), knowledge-base (portals + articles + search), notifications (dispatcher + settings), analytics (metrics + SLA), shell (inbox UI components), core (event bus + hooks + utils)
- Built 4 apps: api (Hono server — starts and responds), web (Next.js inbox UI — builds and renders), realtime (stub), widget (stub)
- 100 PRs merged to develop, 122 total created
- 610 test cases across 52 files, all passing
- 30+ Opus 4.7 review passes covering: security, logic bugs, edge cases, race conditions, data validation, return types, test quality, dependencies, barrel exports, state corruption, integration flow, schema drift, external failures, error boundaries, API completeness, module deep dives (all 6 modules), UI deep dive, blind spots, staleness check

**Key bugs found and fixed (selection of ~30+):**
- XSS in MessageBubble (dangerouslySetInnerHTML unsanitized)
- senderId/createdBy impersonation via request body
- actorId from user-controllable header (moved to auth context)
- Keyword routing false positives (string.includes → word-boundary regex)
- Round-robin skip after membership change (index clamping)
- EventBus error swallowing (handler isolation with try/catch)
- Empty message body accepted at data layer
- Case-sensitive email dedup (normalized to lowercase)
- Snooze with past date accepted
- Contact removable from own conversation
- assigneeId bypass via updateConversation
- Email prefix stripping incomplete (loop for stacked Re:/Fwd:)
- Article slug collisions (unique per portal)
- Category circular parent references (chain detection)
- Article status transitions unrestricted (draft→published→archived enforced)
- Team deletion orphaning routing rules (guard added)
- Self-handoff infinite loop (guard added)
- resolvedAt not cleared on reopen (KPI corruption)
- Public KB routes exposing internal IDs (sanitized)
- DATABASE_URL crash with no error message (clear error added)
- Notification dispatcher missing event types (participant_joined added)
- Node.js 25 localStorage breaking Next.js SSR (polyfill added)

**Architecture + infrastructure:**
- Unified DB types (camelCase matching Drizzle output)
- All 11 tsconfigs extend base
- Full ESM compliance (.js extensions)
- Smart error middleware (158 routes protected)
- Shared utils (generateId, zUuid, jsonError, parseUuidParam)
- Adapter factory for Phase B Drizzle wiring
- Cross-module event bus with bootstrap wiring
- Integration checklist with race conditions documented
- Continuous improvement loop doc
- .env.example with all required vars
- API integration tests

**What the platform does (when wired to DB):**
- Customer support inbox (conversations, assignment, status management)
- Multi-channel (web chat WebSocket + email with threading)
- Agent-native (Ron Swanson as copilot, handoff protocols)
- Knowledge base (customer-facing help center)
- Routing (keyword rules, round-robin, teams)
- Notifications (event-driven, per-user settings)
- Analytics (conversation metrics, SLA tracking)

**Decisions made:**
- Conversation-centric architecture over event-pipeline or microkernel
- Single User table for humans and agents (type discriminator)
- Neon over Supabase (Clerk handles auth)
- Hono over Next.js API routes (WebSocket support)
- MVP = standard inbox first, agent features Phase 2
- camelCase types matching Drizzle (not snake_case from Rails)
- See docs/decisions.md for full register

**Critical findings documented for next session:**
- Message flow is 2/8 connected — modules are islands (docs/integration-checklist.md)
- E2E tests reimplemented 3 modules (identity, notifications, analytics)
- 4 race conditions to fix during Drizzle wiring
- Widget needs visitor token system (security)

**What's next:**
1. Set up Neon database + run drizzle-kit generate + migrations
2. Phase B: Wire Drizzle adapters (~8 sessions, per docs/integration-checklist.md)
3. Phase C: Connect modules (5 wiring points documented)
4. Make UI functional (connect to real API, add click handlers)
5. Deploy to Fly.io

**Blocked / needs Fraser:**
- Widget visitor token design (conversation ID enumeration without auth)
- Neon database provisioning (needs account setup)
- UI design direction (current scaffold is basic — needs design review)
- Whether to use forked or fresh agents going forward (fresh recommended)

## [2026-05-09] -- Overnight improvement loop: 47 PRs, 17 Opus 4.7 passes

**What got done (improvement loop ~23:00-07:00):**
- Merged integration PR (#21) combining all 15 module PRs
- Applied security hardening: scrypt API keys, timingSafeEqual, HTML sanitization, CORS fail-closed, body limit, actorId from auth context
- Fixed 10+ real bugs: keyword routing false positives, round-robin skip after membership change, wrong actorId in audit, EventBus error swallowing, empty search crash, iterator mutation in broadcast, snooze with past date
- Added 25+ new tests: assignment-hooks, permissions, channel registry, metadata merge, keyword boundaries, round-robin membership, notification settings, auth edge cases
- Standardized API responses: consistent `{ ok: true }` shape, error format `{ error, details? }`, manifest naming
- Performance: cached keyword regex compilation in routing evaluator
- Cleaned up: deleted dead files, removed test-only exports from barrels, fixed tsconfigs, removed clerk_id from user create schema
- 9 Opus 4.7 review passes: individual PRs, architecture, fresh-eyes, quality, coverage, bugs, security, API consistency, performance

**What's next:**
1. Wire to Neon database (Drizzle adapters replace in-memory stores)
2. Connect Next.js inbox to real Hono API
3. Deploy to Fly.io
4. Embeddable widget

**Blocked / needs Fraser:**
- Widget visitor token system (conversation ID enumeration without auth)
- Analytics N+1 queries (needs grouped SQL, architectural decision)

## [2026-05-09] -- Built entire agent-native messaging platform from scratch

**What got done:**
- Brainstormed and designed the architecture with Fraser (conversation-centric, deep modules, agent-native from day 1)
- Wrote architecture spec, got Opus 4.7 review, incorporated feedback
- Built 11 packages from scratch: db (Drizzle/Neon), identity (Clerk+API keys), conversations (CRUD+status+messages+assignment+labels), channels (web chat WebSocket + email threading), routing (rules engine+round-robin+snooze), agents (orchestrator+copilot+handoffs), knowledge-base (portals+articles+search), notifications (dispatcher+settings), analytics (metrics+SLA), shell (inbox UI components), core (event bus+cross-module hooks)
- Built 4 apps: api (Hono server), web (Next.js inbox UI with shadcn), realtime (stub), widget (stub)
- 27,525 lines of TypeScript, 142 source files, 46 test files
- 700+ tests passing (unit + 92 E2E), 36/36 turbo tasks green
- Security hardened: scrypt API keys, timingSafeEqual everywhere, HTML sanitization, CORS fail-closed, body size limit
- 3 Opus 4.7 review passes: individual PR reviews, architecture coherence, fresh-eyes final review
- 17/19 quality sweep findings fixed
- 19 PRs merged to develop (40 PRs total created including closed/superseded ones)
- Cloned 3 reference repos (Mastra, Chaskiq, Trigger.dev) for pattern reference

**Decisions made:**
- Conversation-centric architecture (not event-pipeline or microkernel)
- Single User table for humans and agents (type discriminator)
- Neon over Supabase (Clerk handles auth, don't need Supabase extras)
- Hono over Next.js API routes (WebSocket support, lightweight)
- Fly.io for deployment (syd region)
- Upstash for managed Redis (presence, pub/sub, BullMQ)
- shadcn/ui for components (owned, not dependency)
- MVP = standard support inbox first, agent-native features Phase 2 (per Joanna's requirements)
- ConversationParticipant role "contact" not "owner" (avoids support terminology confusion)
- Single assignee enforced via Conversation.assignee_id FK
- Presence in Redis, not Postgres (ephemeral state)
- Channel-agnostic conversations (email and chat are the same Conversation)

**What's next:**
1. Set up Neon database + run Drizzle migrations
2. Wire Drizzle adapters to replace in-memory stores
3. Connect Next.js inbox to real Hono API (replace mock data)
4. Configure Clerk auth end-to-end
5. Deploy to Fly.io
6. Build embeddable widget JS snippet

**Blocked / needs Fraser:**
- Widget visitor token system (conversation IDs are enumerable without per-session tokens — security design decision)
- Analytics module uses raw SQL instead of Drizzle (architectural choice — migrate or keep?)
- Project naming: still called "platform/" — needs a real name
