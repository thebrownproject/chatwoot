# syntax=docker/dockerfile:1.7

FROM node:20-slim AS builder
WORKDIR /app

# Workspace context is expected to be the repo root; build from there with:
#   docker build -f chatwoot-next/apps/realtime/Dockerfile chatwoot-next
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/realtime ./apps/realtime
COPY packages ./packages

RUN corepack enable \
  && pnpm install --frozen-lockfile --filter @chatwoot-next/realtime... \
  && pnpm --filter @chatwoot-next/realtime build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/realtime/dist ./dist
COPY --from=builder /app/apps/realtime/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/realtime/node_modules ./node_modules-app

EXPOSE 3002
CMD ["node", "dist/server.js"]
