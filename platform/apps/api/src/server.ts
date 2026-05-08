import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { routes } from './routes/index.js';

const app = new Hono();

app.use('*', requestId());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : 'http://localhost:3000',
  }),
);
app.use('*', requestLogger);
app.onError(errorHandler);
app.route('/api/v1', routes);

export { app };
