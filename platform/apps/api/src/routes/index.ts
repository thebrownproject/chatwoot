import { Hono } from 'hono';
import { health } from './health.js';

const routes = new Hono();

routes.route('/health', health);

// TODO: Mount identity module routes when @buildpass/identity is available
// routes.route('/users', users);
// routes.route('/auth', auth);

export { routes };
