FROM node:20-slim AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/workers/package.json apps/workers/package.json
COPY packages packages
RUN corepack enable && pnpm install --frozen-lockfile --filter @chatwoot-next/workers...

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app /app
COPY apps/workers apps/workers
COPY tsconfig.base.json tsconfig.base.json
RUN corepack enable && pnpm --filter @chatwoot-next/workers build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/workers/dist /app/apps/workers/dist
COPY --from=build /app/apps/workers/package.json /app/apps/workers/package.json
WORKDIR /app/apps/workers
CMD ["node", "dist/index.js"]
