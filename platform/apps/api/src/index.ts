import { serve } from '@hono/node-server';
import { app } from './server.js';

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server listening on port ${port}`);
});
