import { serve } from '@hono/node-server';
import { app } from './server.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server listening on port ${port}`);
});
