# Decision Register

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
