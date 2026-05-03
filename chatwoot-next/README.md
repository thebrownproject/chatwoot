# chatwoot-next

The Next.js + TypeScript rewrite of Chatwoot. This monorepo follows the
strangler-fig migration plan documented in
`/root/.claude/plans/great-i-want-to-humble-nygaard.md`, gradually replacing
the Rails app at the repository root.

## Workspace structure

- `apps/*` — runnable applications (web, admin, etc.). Owned by per-app agents.
- `packages/*` — shared libraries (ui, config, types, etc.). Owned by per-package agents.

The `apps/` and `packages/` directories are populated incrementally; the
workspace globs in `pnpm-workspace.yaml` are forward-looking.

## Getting started

Run `pnpm install` from this directory (`/home/user/chatwoot/chatwoot-next/`)
once the workspaces exist. Common commands:

- `pnpm dev` — run all dev tasks via Turbo
- `pnpm build` — build all workspaces
- `pnpm lint` — lint all workspaces
- `pnpm typecheck` — typecheck all workspaces
- `pnpm test` — run all tests
- `pnpm clean` — clean build artifacts and `node_modules`

## Tooling

- pnpm workspaces + Turborepo for orchestration
- TypeScript with strict settings (see `tsconfig.base.json`)
- ESLint flat config (root is minimal; per-package configs extend it)
- Prettier for formatting
