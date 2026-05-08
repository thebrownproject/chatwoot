import type { AnalyticsManifest } from './types.js';

export const manifest: AnalyticsManifest = {
  name: 'analytics',
  routes: [
    'GET /analytics/overview',
    'GET /analytics/conversations',
    'GET /analytics/agents',
    'GET /analytics/agents/:id',
    'GET /analytics/teams',
    'GET /analytics/channels',
    'GET /analytics/sla',
    'GET /analytics/sla/breaches',
  ],
  permissions: [
    'analytics.read',
    'analytics.agents.read',
    'analytics.teams.read',
    'analytics.sla.read',
  ],
};
