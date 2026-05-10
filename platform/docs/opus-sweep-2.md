# Opus 4.7 Codebase Sweep — Wave 2: Deployment Readiness

**Scope:** `/Users/fraser/buildpass-os/reference-repos/thebrownproject/chatwoot/platform`
**Started:** 2026-05-10
**Goal:** Fix cross-cutting issues flagged by Wave 1, harden for support team deployment next week
**Loop interval:** 5 minutes
**Agents per loop:** 1 (fresh agent, `subagent_type: "general-purpose"`, NO worktree — commit directly to develop)

## Context for agents

Wave 1 swept all 24 targets individually. It found 211 issues and added 315 tests. But each agent worked in isolation, so cross-cutting problems were flagged but not fixed. This wave fixes those.

**Key Wave 1 findings that need fixing:**
- `conversations.ts` uses `isDrizzleDb()` duck-typing instead of the Db adapter pattern (flagged by targets 1, 2, 5)
- DbClient type defined in two places (types.ts vs db.ts) — needs consolidation
- Regex HTML sanitizer should be replaced with DOMPurify (flagged by targets 7, 8, 23)
- `x-actor-id` header is spoofable — needs Clerk auth context (flagged by targets 12, 22)
- 4 pre-existing API integration test failures from isDrizzleDb pattern
- Web-app fixes lost (target 23 fresh agent worktree cleaned up)
- Module-scoped mutable state should move into adapters for buildpass-ops portability

## Loop Procedure (read this every iteration)

1. Read THIS file to find the next target with status `pending`
2. Dispatch 1 Opus 4.7 agent using `Agent` tool with `subagent_type: "general-purpose"` and `model: "opus"` — NO isolation/worktree
3. Agent prompt must include:
   - The specific target description and files
   - What to fix and why
   - Test command to run
   - Process cleanup rules
4. Update this file: change target from `pending` to `dispatched`
5. Schedule next wake-up in 5 minutes (270s for cache)
6. When agent results come back, update status to `done` or `failed` and log summary

## Agent Mandate (copy into every agent prompt)

```
You are improving a TypeScript messaging platform at /Users/fraser/buildpass-os/reference-repos/thebrownproject/chatwoot/platform.
This platform deploys to Buildpass next week for the support team. You are on the develop branch.

Your job:
1. READ: Read all files for your target thoroughly
2. FIX: Make the changes described in your target
3. TEST: Run tests and ensure they pass
4. COMMIT: Commit directly to develop with a conventional commit message

Test commands:
- For packages: cd platform/packages/<name> && pnpm exec vitest run
- For apps: cd platform/apps/<name> && pnpm exec vitest run
- For e2e: cd platform && pnpm test:e2e
- Full suite: cd platform && pnpm test

CRITICAL — PROCESS CLEANUP:
- ALWAYS use `vitest run`, NEVER `vitest` (watch mode)
- NEVER use `pnpm dev`, `pnpm start`, or any long-running command
- Before finishing: pkill -f "node.*vitest" 2>/dev/null; true
- Do NOT leave any background processes running

Conventions:
- TypeScript strict, ESM, .js extensions in imports
- Vitest, Hono, Drizzle ORM
- Commit messages: type(scope): subject
- Do NOT reference Claude in commit messages
```

## Targets

| # | Target | Focus | Key Files | Status | Summary |
|---|--------|-------|-----------|--------|---------|
| 1 | web-app-refix | Re-apply XSS, accessibility, logic fixes lost from Wave 1 target 23 | apps/web/src/components/*.tsx, src/lib/*.ts, src/app/*.tsx | done | 2 gaps fixed (13/15 already present) |
| 2 | isDrizzleDb-migration | Migrate conversations.ts from isDrizzleDb() duck-typing to Db adapter pattern | packages/conversations/src/data/conversations.ts, src/data/db.ts | done | 534→192 lines, isDrizzleDb removed, API tests 24/24 |
| 3 | api-integration-fix | Fix 4 pre-existing API integration test failures caused by isDrizzleDb pattern | apps/api/src/__tests__/api-integration.test.ts, apps/api/src/routes/index.ts | done (covered by #2) | API tests now 24/24 passing |
| 4 | type-consolidation | Consolidate DbClient (types.ts) and Db (db.ts) into single type, remove duplication | packages/conversations/src/types.ts, src/data/db.ts, all files importing DbClient | done | DbClient deprecated, alias to Db, shared.ts fixed |
| 5 | html-sanitizer-upgrade | Replace regex-based HTML sanitizer with DOMPurify (or isomorphic-dompurify for SSR) | packages/channels/src/adapters/email.ts, apps/web/src/components/MessageBubble.tsx | done | DOMPurify installed, 139 tests passing |
| 6 | auth-context-hardening | Replace spoofable x-actor-id/x-user-id headers with auth context from middleware | apps/api/src/routes/index.ts, packages/*/src/routes/*.ts | done | x-actor-id replaced with auth context, 5 files |
| 7 | response-shape-audit | Audit all API routes return consistent { data: ... } shape, fix any remaining raw returns | packages/*/src/routes/*.ts | done | 8 endpoints fixed in channels+widget, 760+ tests passing |
| 8 | ws-subscription-auth | Add participant-check callback to WebSocket subscribe flow | packages/channels/src/realtime/*.ts | done | onAuthorize callback added, 3 tests, 142 passing |
| 9 | module-state-cleanup | Move module-scoped mutable state (stores, counters, caches) into adapter/DI pattern | packages/conversations/src/data/conversations.ts, packages/routing/src/assigner.ts, packages/channels/src/registry.ts | done | 16 instances documented, reset functions added, 891 tests |
| 10 | full-flow-integration | Write comprehensive integration tests for the 3 critical support flows: conversation lifecycle, email inbound→reply, assignment+routing | tests/e2e/ | done | 15 tests across 3 flows, all passing |

## Results Log

(Updated as agents complete)
