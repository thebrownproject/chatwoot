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
| **conversations** | Core inbox. Conversation CRUD, status machine (open -> pending -> snoozed -> resolved), participant management, messages, assignment, conversation events/audit log |
| **identity** | Auth (Clerk integration + agent API keys), user profiles, presence, permissions. Single User model for humans and agents |
| **channels** | Channel adapters. Email + web chat first. Each adapter implements: receive(), deliver(), formatMessage(). Channel-agnostic conversation creation |
| **routing** | Assignment rules, round-robin, team-based routing, queue management. Evaluates rules on conversation creation/update |
| **shell** | Product chrome — sidebar, navigation, layout, module registry |
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
| status | enum: online, offline, away, busy | Presence |
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
| status | enum: open, pending, snoozed, resolved | State machine |
| channel_origin | enum: email, web_chat, sms, slack, in_app | Where it started |
| subject | text (nullable) | Email subject or manual title |
| priority | enum: low, medium, high, urgent | |
| snoozed_until | timestamptz (nullable) | Auto-reopen |
| first_reply_at | timestamptz (nullable) | KPI: time to first reply |
| resolved_at | timestamptz (nullable) | KPI: resolution time |
| metadata | jsonb | Buildpass project ID, tags, custom fields |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ConversationParticipant** — join table with role semantics.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK -> Conversation |
| user_id | uuid | FK -> User |
| role | enum: owner, assignee, observer, copilot | owner = customer. copilot = agent-behind-the-scenes |
| joined_at | timestamptz | |
| left_at | timestamptz (nullable) | |

**Message**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| conversation_id | uuid | FK -> Conversation |
| sender_id | uuid | FK -> User |
| type | enum: text, rich, activity, internal_note | |
| visibility | enum: public, internal | Copilot messages default to internal |
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
3. **identity module** — Clerk integration, User model, auth middleware

### Phase 1: Core Inbox
4. **conversations module** — CRUD, status machine, participants, messages, events
5. **channels: web chat** — widget adapter, WebSocket connection, realtime delivery
6. **channels: email** — SMTP/IMAP adapter, email-to-conversation threading
7. **routing module** — assignment rules, team routing, queue
8. **shell** — inbox UI, conversation view, sidebar, navigation

### Phase 2: Agent-Native
9. **agents module** — copilot mode, Ron integration, handoff protocols
10. **knowledge-base module** — article management, public portal, search
11. **notifications module** — push, email digests, in-app
12. **analytics module** — conversation metrics, SLA tracking, KPI dashboards

## Key Design Decisions

1. **Single User table for humans and agents** — `type` discriminates. This is what makes agent-native work at the data level without bolting on a separate agent system.

2. **ConversationParticipant.role = copilot** — agent-behind-the-scenes is a participant role, not a separate concept. Copilot messages are `visibility: internal` by default.

3. **Neon over Supabase** — Buildpass uses Clerk (Supabase Auth redundant), and the platform needs full control over realtime for agent-aware events. Neon gives serverless Postgres with branching, without paying for bypassed services.

4. **Hono over Next.js API routes** — the API server needs WebSocket support and will handle high-throughput message processing. Hono is lightweight and runs anywhere. Next.js handles the web UI.

5. **Channel-agnostic conversations** — email and chat are the same Conversation with different Channel adapters. One workflow, not two. This directly addresses Joanna's core requirement.

6. **MVP is a standard support inbox** — agent-native features are Phase 2. The platform must do basics (assignment, status, workflows) perfectly before AI features matter. Validated by Head of Support feedback.

7. **Module architecture** — follows Buildpass module patterns (thin route adapters, module-owned data/actions/components, central registry). Each module is independently specable and buildable, enabling batch-mode agent execution.

## Open Questions

1. **Project naming** — "chatwoot-next" is a working title that implies Chatwoot fork. This is a new product. Needs a name.
2. **Widget embedding** — how does the web chat widget embed into Buildpass products? Script tag (like Intercom/Chatwoot) or React component (since Buildpass is React)?
3. **Ron integration interface** — what does the agents module API look like from Ron's perspective? Does Ron call into the platform, or does the platform call out to Ron?
4. **Email provider** — SMTP/IMAP directly, or a service like SendGrid/Postmark for deliverability?
5. **File storage** — attachments need to live somewhere. S3/R2/Supabase Storage?
