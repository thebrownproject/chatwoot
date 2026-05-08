/**
 * API documentation endpoint.
 *
 * GET /api/v1/docs — returns a listing of all available endpoints.
 */

import { Hono } from 'hono';

const apiDocs = new Hono();

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  module: string;
}

const endpoints: EndpointDoc[] = [
  // Health
  { method: 'GET', path: '/api/v1/health', description: 'Health check', module: 'core' },

  // Identity
  { method: 'GET', path: '/api/v1/users', description: 'List users (query: type, limit, offset)', module: 'identity' },
  { method: 'POST', path: '/api/v1/users', description: 'Create a user', module: 'identity' },
  { method: 'GET', path: '/api/v1/users/:id', description: 'Get user by ID', module: 'identity' },
  { method: 'PATCH', path: '/api/v1/users/:id', description: 'Update a user', module: 'identity' },

  // Conversations
  { method: 'GET', path: '/api/v1/conversations', description: 'List conversations with filters', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations', description: 'Create a conversation', module: 'conversations' },
  { method: 'GET', path: '/api/v1/conversations/:id', description: 'Get conversation by ID', module: 'conversations' },
  { method: 'PATCH', path: '/api/v1/conversations/:id', description: 'Update a conversation', module: 'conversations' },
  { method: 'GET', path: '/api/v1/conversations/by-number/:displayId', description: 'Get conversation by display number', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/resolve', description: 'Resolve a conversation', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/reopen', description: 'Reopen a conversation', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/snooze', description: 'Snooze a conversation', module: 'conversations' },

  // Messages
  { method: 'GET', path: '/api/v1/conversations/:id/messages', description: 'List messages for a conversation', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/messages', description: 'Create a message', module: 'conversations' },
  { method: 'GET', path: '/api/v1/messages/search', description: 'Search messages', module: 'conversations' },

  // Participants
  { method: 'GET', path: '/api/v1/conversations/:id/participants', description: 'List conversation participants', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/participants', description: 'Add a participant', module: 'conversations' },
  { method: 'DELETE', path: '/api/v1/conversations/:id/participants/:userId', description: 'Remove a participant', module: 'conversations' },

  // Assignment
  { method: 'POST', path: '/api/v1/conversations/:id/assign', description: 'Assign conversation to a user', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/unassign', description: 'Unassign conversation', module: 'conversations' },
  { method: 'GET', path: '/api/v1/conversations/:id/assignee', description: 'Get conversation assignee', module: 'conversations' },

  // Events
  { method: 'GET', path: '/api/v1/conversations/:id/events', description: 'List conversation events (audit log)', module: 'conversations' },

  // Labels
  { method: 'GET', path: '/api/v1/labels', description: 'List all labels', module: 'conversations' },
  { method: 'POST', path: '/api/v1/labels', description: 'Create a label', module: 'conversations' },
  { method: 'POST', path: '/api/v1/conversations/:id/labels', description: 'Add label to conversation', module: 'conversations' },
  { method: 'DELETE', path: '/api/v1/conversations/:id/labels/:labelId', description: 'Remove label from conversation', module: 'conversations' },

  // Canned Responses
  { method: 'GET', path: '/api/v1/canned-responses', description: 'List canned responses', module: 'conversations' },
  { method: 'POST', path: '/api/v1/canned-responses', description: 'Create canned response', module: 'conversations' },
  { method: 'GET', path: '/api/v1/canned-responses/:id', description: 'Get canned response by ID', module: 'conversations' },
  { method: 'PATCH', path: '/api/v1/canned-responses/:id', description: 'Update canned response', module: 'conversations' },
  { method: 'DELETE', path: '/api/v1/canned-responses/:id', description: 'Delete canned response', module: 'conversations' },

  // Channels
  { method: 'GET', path: '/api/v1/channels', description: 'List channels', module: 'channels' },
  { method: 'POST', path: '/api/v1/channels', description: 'Create a channel', module: 'channels' },
  { method: 'GET', path: '/api/v1/channels/:id', description: 'Get channel by ID', module: 'channels' },
  { method: 'PATCH', path: '/api/v1/channels/:id', description: 'Update a channel', module: 'channels' },
  { method: 'DELETE', path: '/api/v1/channels/:id', description: 'Deactivate a channel', module: 'channels' },

  // Widget (public)
  { method: 'POST', path: '/api/v1/widget/conversations', description: 'Start widget conversation (public)', module: 'channels' },
  { method: 'GET', path: '/api/v1/widget/conversations/:id/messages', description: 'Get widget messages (public)', module: 'channels' },
  { method: 'POST', path: '/api/v1/widget/conversations/:id/messages', description: 'Send widget message (public)', module: 'channels' },

  // Email webhook
  { method: 'POST', path: '/api/v1/email/inbound', description: 'Inbound email webhook', module: 'channels' },

  // Agents
  { method: 'GET', path: '/api/v1/agents', description: 'List registered agents', module: 'agents' },
  { method: 'POST', path: '/api/v1/agents', description: 'Register an agent', module: 'agents' },
  { method: 'GET', path: '/api/v1/agents/:id', description: 'Get agent config', module: 'agents' },
  { method: 'PATCH', path: '/api/v1/agents/:id', description: 'Update agent config', module: 'agents' },

  // Copilot
  { method: 'GET', path: '/api/v1/copilot/:conversationId/suggestions', description: 'List pending copilot suggestions', module: 'agents' },
  { method: 'POST', path: '/api/v1/copilot/:id/accept', description: 'Accept a copilot suggestion', module: 'agents' },
  { method: 'POST', path: '/api/v1/copilot/:id/dismiss', description: 'Dismiss a copilot suggestion', module: 'agents' },

  // Handoff
  { method: 'POST', path: '/api/v1/conversations/:id/handoff', description: 'Request agent handoff', module: 'agents' },
  { method: 'POST', path: '/api/v1/conversations/:id/handoff-to-agent', description: 'Hand conversation to agent', module: 'agents' },

  // Routing
  { method: 'GET', path: '/api/v1/routing/rules', description: 'List routing rules', module: 'routing' },
  { method: 'POST', path: '/api/v1/routing/rules', description: 'Create a routing rule', module: 'routing' },
  { method: 'PATCH', path: '/api/v1/routing/rules/:id', description: 'Update a routing rule', module: 'routing' },
  { method: 'DELETE', path: '/api/v1/routing/rules/:id', description: 'Delete a routing rule', module: 'routing' },

  // Teams
  { method: 'GET', path: '/api/v1/teams', description: 'List teams', module: 'routing' },
  { method: 'POST', path: '/api/v1/teams', description: 'Create a team', module: 'routing' },
  { method: 'GET', path: '/api/v1/teams/:id', description: 'Get team by ID', module: 'routing' },
  { method: 'GET', path: '/api/v1/teams/:id/members', description: 'List team members', module: 'routing' },
  { method: 'POST', path: '/api/v1/teams/:id/members', description: 'Add team member', module: 'routing' },
  { method: 'DELETE', path: '/api/v1/teams/:id/members/:userId', description: 'Remove team member', module: 'routing' },

  // Knowledge Base — Admin
  { method: 'GET', path: '/api/v1/portals', description: 'List portals', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/portals', description: 'Create a portal', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/portals/:id', description: 'Get portal by ID', module: 'knowledge-base' },
  { method: 'PATCH', path: '/api/v1/portals/:id', description: 'Update a portal', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/portals/:id/categories', description: 'List categories for a portal', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/portals/:id/categories', description: 'Create a category', module: 'knowledge-base' },
  { method: 'PATCH', path: '/api/v1/categories/:id', description: 'Update a category', module: 'knowledge-base' },
  { method: 'DELETE', path: '/api/v1/categories/:id', description: 'Delete a category', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/portals/:id/articles', description: 'List articles for a portal', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/portals/:id/articles', description: 'Create an article', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/articles/:id', description: 'Get article by ID', module: 'knowledge-base' },
  { method: 'PATCH', path: '/api/v1/articles/:id', description: 'Update an article', module: 'knowledge-base' },
  { method: 'DELETE', path: '/api/v1/articles/:id', description: 'Delete an article', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/articles/:id/publish', description: 'Publish an article', module: 'knowledge-base' },
  { method: 'POST', path: '/api/v1/articles/:id/archive', description: 'Archive an article', module: 'knowledge-base' },

  // Knowledge Base — Public
  { method: 'GET', path: '/api/v1/kb/:slug', description: 'Get public portal by slug', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/kb/:slug/categories', description: 'List public categories', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/kb/:slug/articles', description: 'List public (published) articles', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/kb/:slug/articles/:articleSlug', description: 'Get public article by slug', module: 'knowledge-base' },
  { method: 'GET', path: '/api/v1/kb/:slug/search', description: 'Search public articles', module: 'knowledge-base' },

  // Notifications
  { method: 'GET', path: '/api/v1/notifications', description: 'List notifications for current user', module: 'notifications' },
  { method: 'GET', path: '/api/v1/notifications/unread-count', description: 'Get unread notification count', module: 'notifications' },
  { method: 'POST', path: '/api/v1/notifications/:id/read', description: 'Mark notification as read', module: 'notifications' },
  { method: 'POST', path: '/api/v1/notifications/read-all', description: 'Mark all notifications as read', module: 'notifications' },
  { method: 'GET', path: '/api/v1/notifications/settings', description: 'Get notification settings', module: 'notifications' },
  { method: 'PATCH', path: '/api/v1/notifications/settings', description: 'Update notification settings', module: 'notifications' },

  // Analytics
  { method: 'GET', path: '/api/v1/analytics/conversations', description: 'Get conversation metrics', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/agents/:id', description: 'Get agent metrics', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/teams/:id', description: 'Get team metrics', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/channels', description: 'Get channel metrics', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/sla/breaches', description: 'Check SLA breaches', module: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/sla/stats', description: 'Get SLA compliance stats', module: 'analytics' },

  // Docs
  { method: 'GET', path: '/api/v1/docs', description: 'This endpoint — list all API endpoints', module: 'core' },
];

apiDocs.get('/', (c) => {
  // Group by module
  const byModule: Record<string, EndpointDoc[]> = {};
  for (const ep of endpoints) {
    if (!byModule[ep.module]) {
      byModule[ep.module] = [];
    }
    byModule[ep.module]!.push(ep);
  }

  return c.json({
    version: '0.1.0',
    totalEndpoints: endpoints.length,
    modules: Object.keys(byModule).sort(),
    endpoints: byModule,
  });
});

export { apiDocs };
