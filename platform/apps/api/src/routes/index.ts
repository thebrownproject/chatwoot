/**
 * API route index.
 *
 * Mounts all module routes under /api/v1/ (the base path is set in server.ts).
 * Uses dynamic imports with try/catch so modules that aren't fully wired yet
 * don't prevent the server from starting.
 */

import { Hono } from 'hono';
import { health } from './health.js';
import { apiDocs } from './api-docs.js';

const routes = new Hono();

// Core routes (always available)
routes.route('/health', health);
routes.route('/docs', apiDocs);

// Mount module routes asynchronously
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function mountModuleRoutes() {
  // Conversations module
  try {
    const mod = await import('@buildpass/conversations');
    routes.route('/conversations', mod.conversationRoutes);
    routes.route('/', mod.messageRoutes);
    routes.route('/', mod.participantsRoutes);
    routes.route('/', mod.assignmentRoutes);
    routes.route('/', mod.eventsRoutes);
    routes.route('/', mod.labelRoutes);
    routes.route('/canned-responses', mod.cannedResponseRoutes);
  } catch {
    // Module not wired yet
  }

  // Agents module
  try {
    const mod = await import('@buildpass/agents');
    routes.route('/agents', mod.agentRoutes);
    routes.route('/copilot', mod.copilotRoutes);
    routes.route('/', mod.handoffRoutes);
  } catch {
    // Module not wired yet
  }

  // Identity module (TODO: wire db adapter)
  // Channels module (TODO: wire db adapter)
  // Routing module (TODO: wire db adapter — factory functions need RoutingDb)
  // Knowledge Base module (TODO: wire db adapter — factory functions)
  // Notifications module (TODO: wire db adapter)
  // Analytics module (TODO: wire db adapter)
})();

export { routes };
