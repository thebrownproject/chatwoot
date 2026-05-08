/**
 * Channels module manifest.
 *
 * Registers the channels module with the platform, declaring its
 * routes, capabilities, and any nav items.
 */
export const channelsManifest = {
  name: 'channels',
  description: 'Channel adapters for web chat, email, SMS, Slack, and in-app messaging',
  routes: [
    { path: '/channels', method: 'GET' as const },
    { path: '/channels', method: 'POST' as const },
    { path: '/channels/:id', method: 'GET' as const },
    { path: '/channels/:id', method: 'PATCH' as const },
    { path: '/channels/:id', method: 'DELETE' as const },
    { path: '/widget/conversations', method: 'POST' as const },
    { path: '/widget/conversations/:id/messages', method: 'GET' as const },
    { path: '/widget/conversations/:id/messages', method: 'POST' as const },
  ],
  capabilities: ['receive', 'deliver', 'formatMessage'],
  adapters: ['web_chat'] as const,
};
