/**
 * Module registration metadata for the conversations module.
 * Used by the central module registry to discover and mount this module.
 */
export const manifest = {
  name: 'conversations',
  description: 'Conversation lifecycle management — CRUD, status machine, state transitions',
  version: '0.1.0',
  routes: {
    prefix: '/conversations',
  },
  capabilities: [
    'conversation:create',
    'conversation:read',
    'conversation:update',
    'conversation:resolve',
    'conversation:reopen',
    'conversation:snooze',
  ],
} as const;
