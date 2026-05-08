# @buildpass/platform

Agent-native messaging platform for Buildpass. TypeScript monorepo powered by pnpm workspaces and Turborepo.

## Structure

- `packages/` — shared modules (conversations, identity, channels, routing, agents, knowledge-base, notifications, analytics, shell, db)
- `apps/` — deployable applications (web, api, realtime, widget)

## Development

```bash
pnpm install
pnpm dev
```
