# Continuous Improvement Loop

This document defines the intent and process for the autonomous improvement loop that runs on this codebase. **Read this document at the start of every loop tick.**

## Critical Mindset

**Never assume the codebase is fully functional.** There are always more bugs, edge cases, and issues hiding. Every module has untested paths, every integration has gaps, every edge case has a variant that hasn't been considered. The codebase looks clean on the surface — that's when the subtle bugs are hardest to find. Dig deeper every pass. The point of this loop is to make the app more flawless with every tick, not to confirm it's already done.

## Intent

The loop continuously improves the codebase by:
1. Finding bugs, edge cases, and security issues
2. Improving test coverage
3. Fixing code quality issues
4. Ensuring the codebase is always buildable and runnable

## Every Tick Must:

1. **Kill lingering processes** — `pkill -f "vitest|turbo|tsx|next"`
2. **Regression check** — `npx turbo typecheck test --force` must be 36/36 green
3. **Spawn an Opus 4.7 agent** with a fresh review angle (rotate through the list below)
4. **Fix findings directly** — small, focused commits
5. **Commit and merge** — every fix gets a PR

## Review Angles (rotate through)

Each tick should try a DIFFERENT angle. Never repeat the same angle twice in a row.

### Bug Hunting
- Logic bugs (off-by-one, wrong comparisons, missing null checks)
- Race conditions (concurrent operations, shared mutable state)
- Edge cases (empty strings, unicode, boundary values, large payloads)
- State machine gaps (stuck states, invalid transitions)

### Security
- Input validation bypasses (routes without Zod, raw query params)
- Authorization gaps (any user accessing another's data)
- Information disclosure (internal IDs, stack traces in responses)
- Injection vectors (SQL, ReDoS, prototype pollution)

### Code Quality
- Dead code (unused exports, orphaned files)
- Duplication (repeated patterns, extractable utilities)
- Naming consistency (function names, type names, file names)
- Error response consistency (same shape everywhere)

### Testing
- Coverage gaps (functions with no tests, untested error paths)
- Edge case tests (empty inputs, unicode, concurrent operations)
- Test quality (assertions that actually verify behavior, not just "no crash")

### Architecture
- Module boundary violations (deep imports across packages)
- Circular dependencies
- Performance anti-patterns (N+1 queries, unbounded lists, regex in loops)
- Resilience (error isolation, retry logic, cascade prevention)

### Deep Dives
- Pick ONE module and review every function for correctness
- Verify the module's data layer against its route handlers
- Check all state transitions and lifecycle operations

## Rules

- **NO WORKTREES** — work directly on the repo
- **Max 1-2 agents at a time** — avoid CPU/memory pressure
- **Kill processes before every tick** — prevent resource leaks
- **Small commits** — one fix per PR, clear commit messages
- **Always verify** — `turbo typecheck test` must pass before pushing
- **Brief agents well** — give Opus 4.7 specific scope, not vague instructions

## Completed Angles (for reference)

Track which angles have been done to avoid repetition:
- Individual PR reviews, architecture coherence, fresh-eyes, quality sweep
- Coverage gaps, logic bugs, security edge cases, API consistency
- Performance patterns, resilience, duplication, naming, boundaries
- Zod completeness, deep dives (conversations, agents, channels, KB, routing+notifications)
- Edge case stress test, build verification
