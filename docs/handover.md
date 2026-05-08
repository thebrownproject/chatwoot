# Handover Log

## [2026-05-09] -- Overnight improvement loop: 32 PRs, 9 Opus 4.7 passes

**What got done (improvement loop ~23:00-04:00):**
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
