/**
 * Hono API server entrypoint.
 *
 * Wires middleware and mounts all module routes, then starts
 * the server on the configured port.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from './middleware/request-id.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { mountAllRoutes } from './routes/index.js';
import { apiDocs } from './routes/api-docs.js';

type AppEnv = {
  Variables: {
    db: unknown;
    requestId: string;
  };
};

const app = new Hono<AppEnv>();

// ── Global middleware ─────────────────────────────────────────────────────
app.use('*', requestId());
app.use('*', logger());
app.use('*', cors());
app.use('/api/*', rateLimiter({ limit: 100, windowMs: 60_000 }));

// ── API docs (always available) ───────────────────────────────────────────
app.route('', apiDocs);

// ── Module routes ─────────────────────────────────────────────────────────
await mountAllRoutes(app);

// ── Start server ──────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3100;
console.log(`[api] listening on :${port}`);

export default {
  port,
  fetch: app.fetch,
};

export { app };
