# Agent-Native Messaging Platform — Architecture Design

## Overview

A messaging platform for Buildpass, inspired by Chatwoot but rebuilt from scratch in TypeScript. Agent-native from the ground up — AI agents (starting with Ron Swanson) are first-class hybrid participants alongside human agents. Single-tenant, Buildpass-only.

Chatwoot serves as a reference/blueprint for domain patterns (conversations, channels, inbox workflows). The codebase is a guided rebuild, not a migration.

## Problem

Buildpass currently uses Intercom for customer support. Pain points:

- Expensive, with limited customisation
- No native AI agent integration — Ron operates outside the support platform
- No in-app messaging capability for Buildpass products
- No unified messaging substrate for the broader agent ecosystem Buildpass is building

Meanwhile, the support team (led by Joanna, Head of Support) has clear requirements for any replacement:

1. Standard inbox functionality — ticket ownership, assignment, status management (open/snoozed/closed)
2. One workflow for chat and email — not two separate systems
3. AI as a support layer, not the face — customers must be able to choose human support. Construction industry customers escalate fast when hitting walls
4. Customer-facing knowledge base (currently help.buildpass.ai)
5. KPI-driven workflows — team metrics are tied to ticket flow

## Vision

The platform serves four use cases:

1. **Customer support** — agents + humans handling inbound support conversations
2. **In-app messaging** — embedded messaging within Buildpass products (builder-to-certifier, project chat)
3. **Multi-channel hub** — unified routing across email, SMS, web widget, in-app, Slack
4. **Agent-native messaging** — AI agents are first-class hybrid participants: they can own conversations, co-pilot behind humans, and operate as middleware

## Architecture: Conversation-Centric

Everything revolves around a unified Conversation model with a Participant abstraction that treats humans and agents identically.

```
User (human_agent | ai_agent | contact | system)
  └─ joins → Conversation (via ConversationParticipant with role)
       └─ has → Messages (with visibility: public | internal)
       └─ originates from → Channel (email, web_chat, sms, slack, in_app)
       └─ matched by → RoutingRule
```

Design principles (from deep-module thinking):

- **Deep modules** — each module provides high leverage behind a small interface
- **Real seams** — channel adapters, data access, agent orchestration all sit behind swappable interfaces
- **Deletion test** — if removing a module just moves complexity to callers, it's too shallow
- **Locality** — bugs, changes, and knowledge concentrate inside the module, not across seams

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript 5 (strict) | Consistency with Buildpass core-ui, agent-friendly |
| Monorepo | pnpm workspaces + Turborepo | Already scaffolded in chatwoot-next, Buildpass uses Turbo |
| Web app | Next.js + React 19 | Aligns with Buildpass core-ui (Next.js 16, React 19) |
| API server | Hono | Lightweight, runs anywhere, native WebSocket support. Better fit than Next.js API routes for a messaging platform |
| Database | PostgreSQL on Neon | Serverless, branching for dev/test, scale-to-zero for background project. No redundant auth/realtime services (Buildpass uses Clerk) |
| ORM | Drizzle | Excellent TS type inference, lightweight, already started in chatwoot-next |
| Realtime | Custom WebSocket server (Hono + ws) + Redis pub/sub | Full control over agent-aware events (typing, copilot suggestions, handoffs). Supabase Realtime too opinionated for this |
| Auth | Clerk (humans) + API keys (agents) | Buildpass already uses Clerk |
| UI | shadcn/ui (Radix + Tailwind v4) | Matches Buildpass core-ui patterns, components owned not imported |
| Testing | Vitest (unit) + Playwright (E2E) | Matches Buildpass core-ui |
| Jobs/Queue | BullMQ (Redis-backed) | Background jobs for channel delivery, agent processing, notifications |
| Redis | Upstash (serverless) | Managed Redis for pub/sub, BullMQ, presence. No ops burden for a background project |
| Deployment | Fly.io | Supports WebSockets natively, Hono runs well on it, Fraser already uses it for BuildClaw |

### Server Topology

Two servers, independently deployed:

- **Hono API server** (Fly.io) — REST API + WebSocket endpoint. Handles all message processing, channel adapters, realtime delivery. Validates Clerk JWTs for human auth, API keys for agent auth.
- **Next.js web app** (Vercel or Fly.io) — agent dashboard UI. Calls the Hono API. No direct DB access.

In local dev, Next.js proxies API requests to Hono via `next.config.js` rewrites. In production, the Next.js app calls the Hono API directly (same Fly.io private network, or public with CORS).

## Module Decomposition

Each module is a bounded context as a package in the monorepo. Internal structure follows Buildpass module architecture patterns:

```
packages/<module>/
  src/
    data/          # data access functions (module's public data API)
    routes/        # API route handlers
    actions/       # business logic / server actions
    components/    # UI components (if applicable)
    types.ts       # module type definitions
    manifest.ts    # module registration (nav items, permissions, capabilities)
  index.ts         # public barrel export
```

Modules register via a central registry. Route files in `src/app` are thin adapters importing from module route implementations. Data access flows: `route/component -> module data function -> db package` — no raw DB imports in routes.

### P0 — MVP (Standard Support Inbox)

| Module | Responsibility |
|---|---|
| **conversations** | Core inbox. Conversation CRUD, status machine (open -> pending -> snoozed -> resolved), participant management, messages, assignment, conversation events/audit log, canned responses, full-text search |
| **identity** | Auth (Clerk integration + agent API keys), user profiles, permissions, contact deduplication (email-based). Single User model for humans and agents. Presence is Redis-derived, not stored in Postgres |
| **channels** | Channel adapters. Email + web chat first. Each adapter implements: receive(), deliver(), formatMessage(). Channel-agnostic conversation creation. Conversations are locked to one channel for MVP |
| **routing** | Assignment rules, round-robin, team-based routing, queue management. Evaluates rules on conversation creation/update. Moved to Phase 1.5 — manual assignment is sufficient for initial MVP |
| **shell** | Product chrome — sidebar, navigation, layout, module registry. Inbox views: my assignments, team unassigned, filtered by channel/status/label |
| **db** | Drizzle schema, Neon client, data access adapter seam |

### P1 — Phase 2 (Agent-Native + KB)

| Module | Responsibility |
|---|---|
| **agents** | Agent orchestration — copilot mode (internal suggestions), conversation ownership, handoff protocols (agent->human, human->agent, agent->agent), tool execution, reasoning traces, confidence scoring, auto-escalation |
| **knowledge-base** | Customer-facing KB (replaces help.buildpass.ai). Article management, search, public portal, AI-powered article suggestions |
| **notifications** | In-app notifications, push, email digests |
| **analytics** | Conversation lifecycle metrics (first reply time, resolution time), SLA tracking, team KPIs, assignment flow analysis |

## Data Model

### identity module

**User** — single table for all participant types.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| type | enum: human_agent, ai_agent, contact, system | Discriminator |
| name | text | Display name |
| email | text (nullable) | Humans and contacts |
| avatar_url | text (nullable) | |
| metadata | jsonb | Agent: model, capabilities, version. Contact: company, phone |
| clerk_id | text (nullable) | Humans only — Clerk integration |
| api_key_hash | text (nullable) | Agents only — API key auth |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Permission**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK -> User |
| role | enum: admin, agent, contact, bot | |
| capabilities | text[] | assign, resolve, escalate, view_internal, manage_kb, etc. |

### conversations module

**Conversation**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| display_id | serial | Auto-incrementing human-readable ticket number (#4521) |
| status | enum: open, pending, snoozed, resolved | State machine |
| channel_origin | enum: email, web_chat, sms, slack, in_app | Where it started |
| assignee_id | uuid (nullable) | FK -> User. Single assignee enforced at schema level |
| subject | text (nullable) | Email subject or manual title |
| priority | enum: low, medium, high, urgent | |
| snoozed_until | timestamptz (nullable) | Auto-reopen via BullMQ scheduled job |
| first_reply_at | timestamptz (nullable) | KPI: time to first reply |
| resolved_at | timestamptz (nullable) | KPI: resolution time |
| metadata | jsonb | Buildpass project ID, custom fields |
| search_vector | tsvector | Full-text search index (subject + metadata) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ConversationParticipant** — join table with role semantics.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK -> Conversation |
| user_id | uuid | FK -> User |
| role | enum: contact, assignee, observer, copilot | contact = customer. copilot = agent-behind-the-scenes. Assignment tracked on Conversation.assignee_id, not here |
| joined_at | timestamptz | |
| left_at | timestamptz (nullable) | |

**Message**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK -> Conversation |
| sender_id | uuid | FK -> User |
| type | enum: text, rich, activity | No separate internal_note type — use visibility: internal on any type |
| visibility | enum: public, internal | Copilot messages default to internal. Internal notes = type: text + visibility: internal |
| body | text | Plain text content |
| body_html | text (nullable) | Rich formatted content |
| metadata | jsonb | Agent messages: reasoning traces, tool calls, confidence |
| attachments | jsonb | Array of {url, filename, content_type, size} |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ConversationEvent** — audit log powering analytics.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK -> Conversation |
| actor_id | uuid | FK -> User |
| event_type | text | assigned, status_changed, participant_joined, escalated, snoozed, resolved |
| payload | jsonb | Event-specific data (e.g., {from: "open", to: "resolved"}) |
| created_at | timestamptz | |

**Label** — extracted from jsonb for efficient KPI queries.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g., "billing", "onboarding", "bug" |
| color | text (nullable) | Hex color for UI |
| created_at | timestamptz | |

**ConversationLabel**

| Column | Type | Notes |
|---|---|---|
| conversation_id | uuid | FK -> Conversation |
| label_id | uuid | FK -> Label |

**CannedResponse** — saved reply templates.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | Short name for quick search |
| body | text | Template content |
| body_html | text (nullable) | Rich formatted version |
| created_by | uuid | FK -> User |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Message.search_vector** — full-text search on message body (tsvector column, same pattern as Conversation).

### channels module

**Channel**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| type | enum: email, web_chat, sms, slack, in_app | |
| name | text | Display name ("Support Email", "Website Chat") |
| config | jsonb | Channel-specific: SMTP creds, widget key, Slack webhook |
| active | boolean | Enable/disable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ChannelConversation** — maps conversations to external identities.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| channel_id | uuid | FK -> Channel |
| conversation_id | uuid | FK -> Conversation |
| external_id | text | Email message-id, Slack thread_ts, etc. |
| external_metadata | jsonb | Channel-specific threading/state |

### routing module

**Team**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |

**TeamMember**

| Column | Type | Notes |
|---|---|---|
| team_id | uuid | FK -> Team |
| user_id | uuid | FK -> User |
| role | enum: lead, member | |

**RoutingRule**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| priority | int | Lower = higher priority |
| conditions | jsonb | {channel: "email", tags: ["billing"], keywords: [...]} |
| action | enum: assign_agent, assign_team, assign_bot | |
| target_type | enum: user, team | Discriminator for target_id |
| target_id | uuid | FK -> User or Team (polymorphic, discriminated by target_type) |
| active | boolean | |

## Conversation State Transitions

```
                  new message from contact
resolved ──────────────────────────────────→ open
    ↑                                          │
    │ agent resolves                           │ agent sets pending
    │                                          ↓
    └────────────── open ←──────────────── pending
                      │                        ↑
                      │ agent snoozes          │ snooze expires (BullMQ job)
                      ↓                        │
                   snoozed ────────────────────┘
```

Key transitions:
- **New message on resolved conversation** → auto-reopens to `open`
- **Snooze expiry** → BullMQ scheduled job checks `snoozed_until`, transitions to `open`
- **Any status change** → creates a `ConversationEvent` for audit trail

## Presence

User presence (online/offline/away/busy) is **not stored in Postgres**. It is derived from WebSocket connection state and stored in Redis with TTL expiry. The identity module exposes a `getPresence(userId)` function that reads from Redis. This avoids write amplification on every connect/disconnect.

## Message Lifecycle

```
1. INGEST     Channel adapter receives message (email/SMS/widget/Slack/in-app)
                -> normalises to internal Message format
                -> creates or matches to Conversation

2. PROCESS    Routing module evaluates assignment rules
                -> assigns to human agent, AI agent, or queue
                -> if AI agent assigned: agents module takes over (Phase 2)

3. AGENT      (Phase 2) Agent module processes if involved
   (P1)         -> as OWNER: generates response, executes tools, decides actions
                -> as COPILOT: generates suggestion (visibility: internal),
                   human sees it as a draft they can accept/edit/dismiss
                -> can ESCALATE: hands off to human with context summary

4. DELIVER    Message sent back through channel adapter
                -> formatted for the originating channel
                -> delivery confirmation tracked

5. REALTIME   All state changes broadcast via WebSocket
                -> new messages, typing indicators, presence changes
                -> (Phase 2) copilot suggestions, handoff signals, agent actions
```

### Agent-Specific Realtime Events (Phase 2)

- `agent.thinking` — agent is processing (typing indicator equivalent)
- `agent.suggestion` — copilot suggestion ready for human review
- `agent.handoff` — agent requesting human takeover with context
- `agent.tool_call` — agent executing a tool (visible to internal observers)
- `agent.confidence` — agent confidence level (routing can auto-escalate below threshold)

### Handoff Protocol (Phase 2)

- **Agent -> Human**: agent creates internal note with conversation summary + escalation reason, conversation reassigned to human
- **Human -> Agent**: human assigns conversation to agent participant, agent picks up with full conversation history
- **Agent -> Agent**: one agent hands to another (e.g., Ron triage -> specialist agent)

## Subsystem Breakdown for Implementation

Each subsystem gets its own spec -> plan -> batch execution cycle:

### Phase 0: Foundation
1. **Monorepo scaffold** — clean up chatwoot-next, align with this architecture (new schema, remove 1:1 Chatwoot ports)
2. **db package** — Drizzle schema for all P0 tables, Neon connection, migrations
3. **identity module** — Clerk integration, User model, auth middleware, contact dedup

### Phase 1: Core Inbox
4. **conversations: CRUD + status** — conversation create/read/update, status machine, state transitions (including reopen on new message)
5. **conversations: messages + search** — message creation, threading, canned responses, full-text search, labels
6. **conversations: assignment + events** — manual assignment, participant management, conversation events audit log
7. **channels: web chat** — widget adapter, WebSocket connection, realtime delivery
8. **channels: email** — email adapter (SendGrid/Postmark for delivery, webhook for inbound), email-to-conversation threading (known-hard, needs spike)
9. **shell** — inbox UI, conversation view, sidebar, navigation, inbox views (my/team/unassigned/filtered)

### Phase 1.5: Routing + Polish
10. **routing module** — assignment rules, round-robin, team routing, queue management
11. **snooze scheduler** — BullMQ job to reopen snoozed conversations at `snoozed_until`

### Phase 2: Agent-Native
12. **agents module** — copilot mode, Ron integration, handoff protocols
13. **knowledge-base module** — article management, public portal, search
14. **notifications module** — push, email digests, in-app
15. **analytics module** — conversation metrics, SLA tracking, KPI dashboards

## Key Design Decisions

1. **Single User table for humans and agents** — `type` discriminates. This is what makes agent-native work at the data level without bolting on a separate agent system.

2. **ConversationParticipant.role = copilot** — agent-behind-the-scenes is a participant role, not a separate concept. Copilot messages are `visibility: internal` by default. Single assignee enforced via `Conversation.assignee_id` FK, not participant role.

3. **Neon over Supabase** — Buildpass uses Clerk (Supabase Auth redundant), and the platform needs full control over realtime for agent-aware events. Neon gives serverless Postgres with branching, without paying for bypassed services.

4. **Hono over Next.js API routes** — the API server needs WebSocket support and will handle high-throughput message processing. Hono is lightweight and runs anywhere. Next.js handles the web UI.

5. **Channel-agnostic conversations** — email and chat are the same Conversation with different Channel adapters. One workflow, not two. This directly addresses Joanna's core requirement.

6. **MVP is a standard support inbox** — agent-native features are Phase 2. The platform must do basics (assignment, status, workflows) perfectly before AI features matter. Validated by Head of Support feedback.

7. **Module architecture** — follows Buildpass module patterns (thin route adapters, module-owned data/actions/components, central registry). Each module is independently specable and buildable, enabling batch-mode agent execution.

8. **No Inbox entity** — unlike Chatwoot, there's no separate Inbox table. The agent's "inbox" is a query: my assignments + team unassigned, filtered by channel/status/label. This is a UI concern handled by the shell module's views, not a data model concept. Keeps the core model simpler.

9. **Presence in Redis, not Postgres** — ephemeral state (online/offline/away/busy) doesn't belong in the database. Derived from WebSocket connection state, stored in Redis with TTL.

10. **Managed infrastructure** — Upstash for Redis, Neon for Postgres, Fly.io for compute. Minimises ops burden for a background project.

## Open Questions

1. **Project naming** — "chatwoot-next" is a working title that implies Chatwoot fork. This is a new product. Needs a name.
2. **Widget embedding** — how does the web chat widget embed into Buildpass products? Script tag (like Intercom/Chatwoot) or React component (since Buildpass is React)?
3. **Ron integration interface** — what does the agents module API look like from Ron's perspective? Does Ron call into the platform, or does the platform call out to Ron?
4. **File storage** — attachments need to live somewhere. S3/R2/Supabase Storage?
5. **Contact merge strategy** — P0 uses email-based dedup. What's the broader merge story? (Manual merge UI, automatic fuzzy matching, etc.)
6. **Email threading spike** — email threading via In-Reply-To/References is notoriously fragile. Needs a dedicated spike before the email channel implementation.
