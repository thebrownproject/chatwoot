/**
 * API documentation endpoint.
 *
 * GET /api/v1/docs — returns a JSON catalogue of all available endpoints
 * with HTTP methods and descriptions.
 */

import { Hono } from 'hono';

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  auth: 'required' | 'none';
  module: string;
}

const endpoints: EndpointDoc[] = [
  // health
  { method: 'GET', path: '/api/v1/health', description: 'Health check', auth: 'none', module: 'core' },

  // identity — users
  { method: 'GET', path: '/api/v1/users', description: 'List users', auth: 'required', module: 'identity' },
  { method: 'POST', path: '/api/v1/users', description: 'Create a user', auth: 'required', module: 'identity' },
  { method: 'GET', path: '/api/v1/users/:id', description: 'Get user by ID', auth: 'required', module: 'identity' },
  { method: 'PATCH', path: '/api/v1/users/:id', description: 'Update a user', auth: 'required', module: 'identity' },

  // identity — auth
  { method: 'POST', path: '/api/v1/auth/clerk', description: 'Authenticate via Clerk JWT', auth: 'none', module: 'identity' },
  { method: 'POST', path: '/api/v1/auth/api-key', description: 'Authenticate via API key (agents)', auth: 'none', module: 'identity' },

  // conversations
  { method: 'GET', path: '/api/v1/conversations', description: 'List conversations with filters', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations', description: 'Create a conversation', auth: 'required', module: 'conversations' },
  { method: 'GET', path: '/api/v1/conversations/:id', description: 'Get conversation by ID', auth: 'required', module: 'conversations' },
  { method: 'PATCH', path: '/api/v1/conversations/:id', description: 'Update conversation', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/resolve', description: 'Resolve a conversation', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/reopen', description: 'Reopen a conversation', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/snooze', description: 'Snooze a conversation', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/assign', description: 'Assign a conversation', auth: 'required', module: 'conversations' },

  // messages
  { method: 'GET', path: '/api/v1/messages/conversations/:id/messages', description: 'List messages for a conversation', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/messages/conversations/:id/messages', description: 'Send a message', auth: 'required', module: 'conversations' },
  { method: 'GET', path: '/api/v1/messages/search', description: 'Search messages', auth: 'required', module: 'conversations' },

  // labels
  { method: 'GET', path: '/api/v1/labels', description: 'List all labels', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/labels', description: 'Create a label', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/labels/conversations/:id/labels', description: 'Add label to conversation', auth: 'required', module: 'conversations' },
  { method: 'DELETE', path: '/api/v1/labels/conversations/:id/labels/:labelId', description: 'Remove label from conversation', auth: 'required', module: 'conversations' },

  // canned responses
  { method: 'GET', path: '/api/v1/canned-responses', description: 'List canned responses', auth: 'required', module: 'conversations' },
  { method: 'POST', path: '/api/v1/canned-responses', description: 'Create a canned response', auth: 'required', module: 'conversations' },
  { method: 'GET', path: '/api/v1/canned-responses/:id', description: 'Get canned response by ID', auth: 'required', module: 'conversations' },
  { method: 'PATCH', path: '/api/v1/canned-responses/:id', description: 'Update a canned response', auth: 'required', module: 'conversations' },
  { method: 'DELETE', path: '/api/v1/canned-responses/:id', description: 'Delete a canned response', auth: 'required', module: 'conversations' },
  { method: 'GET', path: '/api/v1/canned-responses/search', description: 'Search canned responses', auth: 'required', module: 'conversations' },

  // channels
  { method: 'GET', path: '/api/v1/channels', description: 'List channels', auth: 'required', module: 'channels' },
  { method: 'POST', path: '/api/v1/channels', description: 'Create a channel', auth: 'required', module: 'channels' },
  { method: 'GET', path: '/api/v1/channels/:id', description: 'Get channel by ID', auth: 'required', module: 'channels' },
  { method: 'PATCH', path: '/api/v1/channels/:id', description: 'Update a channel', auth: 'required', module: 'channels' },
  { method: 'DELETE', path: '/api/v1/channels/:id', description: 'Deactivate a channel', auth: 'required', module: 'channels' },

  // widget (public)
  { method: 'POST', path: '/api/v1/widget/conversations', description: 'Start a widget conversation', auth: 'none', module: 'channels' },
  { method: 'GET', path: '/api/v1/widget/conversations/:id/messages', description: 'Fetch widget messages', auth: 'none', module: 'channels' },
  { method: 'POST', path: '/api/v1/widget/conversations/:id/messages', description: 'Send a widget message', auth: 'none', module: 'channels' },

  // webhooks
  { method: 'POST', path: '/api/v1/webhooks/email/inbound', description: 'Inbound email webhook', auth: 'none', module: 'channels' },

  // routing rules
  { method: 'GET', path: '/api/v1/routing-rules', description: 'List routing rules', auth: 'required', module: 'routing' },
  { method: 'POST', path: '/api/v1/routing-rules', description: 'Create a routing rule', auth: 'required', module: 'routing' },
  { method: 'PATCH', path: '/api/v1/routing-rules/:id', description: 'Update a routing rule', auth: 'required', module: 'routing' },
  { method: 'DELETE', path: '/api/v1/routing-rules/:id', description: 'Delete a routing rule', auth: 'required', module: 'routing' },
  { method: 'POST', path: '/api/v1/routing-rules/:id/toggle', description: 'Toggle routing rule active state', auth: 'required', module: 'routing' },

  // teams
  { method: 'GET', path: '/api/v1/teams', description: 'List teams', auth: 'required', module: 'routing' },
  { method: 'POST', path: '/api/v1/teams', description: 'Create a team', auth: 'required', module: 'routing' },
  { method: 'GET', path: '/api/v1/teams/:id', description: 'Get team by ID', auth: 'required', module: 'routing' },
  { method: 'GET', path: '/api/v1/teams/:id/members', description: 'List team members', auth: 'required', module: 'routing' },
  { method: 'POST', path: '/api/v1/teams/:id/members', description: 'Add team member', auth: 'required', module: 'routing' },
  { method: 'DELETE', path: '/api/v1/teams/:id/members/:userId', description: 'Remove team member', auth: 'required', module: 'routing' },

  // agents
  { method: 'GET', path: '/api/v1/agents', description: 'List registered AI agents', auth: 'required', module: 'agents' },
  { method: 'POST', path: '/api/v1/agents', description: 'Register an AI agent', auth: 'required', module: 'agents' },
  { method: 'GET', path: '/api/v1/agents/:id', description: 'Get agent config', auth: 'required', module: 'agents' },
  { method: 'PATCH', path: '/api/v1/agents/:id', description: 'Update agent config', auth: 'required', module: 'agents' },
  { method: 'POST', path: '/api/v1/agents/:id/process', description: 'Trigger agent processing on a conversation', auth: 'required', module: 'agents' },

  // knowledge base — portals
  { method: 'GET', path: '/api/v1/portals', description: 'List portals', auth: 'required', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/portals', description: 'Create a portal', auth: 'required', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/portals/:id', description: 'Get portal by ID', auth: 'required', module: 'knowledge-base' },
  { method: 'PATCH', path: '/api/v1/portals/:id', description: 'Update a portal', auth: 'required', module: 'knowledge-base' },

  // knowledge base — articles
  { method: 'GET', path: '/api/v1/articles', description: 'List articles', auth: 'required', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/articles', description: 'Create an article', auth: 'required', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/articles/:id', description: 'Get article by ID', auth: 'required', module: 'knowledge-base' },
  { method: 'PATCH', path: '/api/v1/articles/:id', description: 'Update an article', auth: 'required', module: 'knowledge-base' },
  { method: 'DELETE', path: '/api/v1/articles/:id', description: 'Delete an article', auth: 'required', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/articles/:id/publish', description: 'Publish an article', auth: 'required', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/articles/:id/archive', description: 'Archive an article', auth: 'required', module: 'knowledge-base' },

  // knowledge base — categories
  { method: 'GET', path: '/api/v1/categories', description: 'List categories', auth: 'required', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/categories', description: 'Create a category', auth: 'required', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/categories/:id', description: 'Get category by ID', auth: 'required', module: 'knowledge-base' },
  { method: 'PATCH', path: '/api/v1/categories/:id', description: 'Update a category', auth: 'required', module: 'knowledge-base' },
  { method: 'DELETE', path: '/api/v1/categories/:id', description: 'Delete a category', auth: 'required', module: 'knowledge-base' },

  // knowledge base — public portal (no auth)
  { method: 'GET', path: '/help/:slug', description: 'Get public portal by slug', auth: 'none', module: 'knowledge-base' },
  { method: 'GET', path: '/help/:slug/categories', description: 'List public categories', auth: 'none', module: 'knowledge-base' },
  { method: 'GET', path: '/help/:slug/articles', description: 'List published articles', auth: 'none', module: 'knowledge-base' },
  { method: 'GET', path: '/help/:slug/articles/:articleSlug', description: 'Read a published article', auth: 'none', module: 'knowledge-base' },

  // notifications
  { method: 'GET', path: '/api/v1/notifications', description: 'List notifications', auth: 'required', module: 'notifications' },
  { method: 'GET', path: '/api/v1/notifications/unread-count', description: 'Get unread notification count', auth: 'required', module: 'notifications' },
  { method: 'POST', path: '/api/v1/notifications/:id/read', description: 'Mark notification as read', auth: 'required', module: 'notifications' },
  { method: 'POST', path: '/api/v1/notifications/read-all', description: 'Mark all notifications as read', auth: 'required', module: 'notifications' },
  { method: 'GET', path: '/api/v1/notifications/settings', description: 'Get notification settings', auth: 'required', module: 'notifications' },
  { method: 'PATCH', path: '/api/v1/notifications/settings', description: 'Update notification settings', auth: 'required', module: 'notifications' },

  // analytics
  { method: 'GET', path: '/api/v1/analytics/conversations', description: 'Conversation lifecycle metrics', auth: 'required', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/agents', description: 'Agent performance metrics', auth: 'required', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/teams', description: 'Team performance metrics', auth: 'required', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/channels', description: 'Channel volume metrics', auth: 'required', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/sla', description: 'SLA breach stats', auth: 'required', module: 'analytics' },

  // docs
  { method: 'GET', path: '/api/v1/docs', description: 'This endpoint — API documentation', auth: 'none', module: 'core' },
];

export const apiDocs = new Hono();

apiDocs.get('/api/v1/docs', (c) => {
  const modules = [...new Set(endpoints.map((e) => e.module))].sort();
  return c.json({
    version: 'v1',
    totalEndpoints: endpoints.length,
    modules,
    endpoints,
  });
});
