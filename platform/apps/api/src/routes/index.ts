import { Hono } from 'hono';
import { health } from './health.js';
import { apiDocs } from './api-docs.js';

const routes = new Hono();

routes.route('/health', health);
routes.route('/docs', apiDocs);

export { routes };
