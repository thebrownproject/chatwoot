# Decision Register

## [2026-05-09] Deployment: buildpass-ops module is the production path

**Decision:** If this messaging platform deploys to Buildpass production, it goes through `buildpass-ops` (`/Users/fraser/buildpass-os/projects/buildpass-ops/`) as a `messaging` module — NOT as a standalone service.

**Rationale:** The module architecture we built (manifest.ts, data/, routes/, components/) already matches buildpass-ops patterns exactly. Buildpass-ops has shared Clerk auth, shared Postgres, shared shell/navigation, and a module registry. Deploying as a module means zero auth duplication, one DB, one deployment.

**What this means:**
- Ship as 1 primary `src/modules/messaging/` module (not 11 separate modules — that fragments the domain)
- Convert Hono routes → Next.js server actions when integrating
- Use buildpass-ops Postgres adapter seam instead of Neon directly
- Register in `src/modules/registry.ts` under "Communication" sidebar group
- Analytics can split to a separate service later if needed (Fly.io backend reading same Postgres)

**Current repo (`thebrownproject/chatwoot`)** is the development/prototyping environment. The business logic, Drizzle schema, and tests developed here are portable to buildpass-ops.

**Phase B (Drizzle wiring)** should still happen here first — validate everything works end-to-end before porting to buildpass-ops.

## [2026-05-08] Architecture: Conversation-Centric
Chose conversation-centric over event-pipeline or microkernel. Conversations are the core primitive with a Participant abstraction treating humans and agents identically. Validated by Opus 4.7 review.

## [2026-05-08] Data Model: Single User table for humans and agents
User.type discriminates (human_agent, ai_agent, contact, system). Agents and humans share the same assignment, messaging, and permission interfaces. This is what makes agent-native work without bolting on a separate system.

## [2026-05-08] Stack: Neon over Supabase
Buildpass uses Clerk for auth (Supabase Auth redundant). Platform needs full control over realtime (agent-aware events). Neon gives serverless Postgres with branching for dev/test, scale-to-zero for background project.

## [2026-05-08] Stack: Hono over Next.js API routes
API server needs WebSocket support and handles high-throughput message processing. Hono is lightweight and runs anywhere. Next.js handles the web UI only.

## [2026-05-08] Phasing: MVP = standard inbox first
Per Joanna (Head of Support): standard inbox functionality is table stakes. Agent-native features (copilot, handoffs) are Phase 2. The platform must do basics perfectly before AI features matter.

## [2026-05-08] Participant role "contact" not "owner"
"Owner" in support means the agent who owns the ticket. Renamed to "contact" to avoid confusion. Single assignee enforced via Conversation.assignee_id FK.

## [2026-05-08] Presence: Redis not Postgres
Ephemeral state (online/offline/away/busy) doesn't belong in the database. Derived from WebSocket connection state, stored in Redis with TTL expiry.

## [2026-05-08] Security: scrypt for API keys
API keys hashed with scrypt (N=16384, r=8, p=1). Stored as salt:derived hex. Timing-safe comparison via crypto.timingSafeEqual. Raw key returned only once on creation.
