# syntax=docker/dockerfile:1.7

FROM node:20-slim AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY src ./src
RUN npx tsc

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
