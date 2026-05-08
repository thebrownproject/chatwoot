# syntax=docker/dockerfile:1.7

FROM node:20-slim AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
RUN corepack enable && npm install

COPY src ./src
RUN npx tsc

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/index.js"]
