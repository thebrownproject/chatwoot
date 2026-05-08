/**
 * Module registration metadata for the agents module.
 * Used by the central module registry to discover and mount this module.
 */
export const manifest = {
  name: 'agents',
  description:
    'Agent orchestration — copilot mode, conversation ownership, handoff protocols, tool execution',
  version: '0.1.0',
  routes: {
    prefix: '/agents',
  },
  capabilities: [
    'agent:register',
    'agent:read',
    'agent:update',
    'agent:process',
    'copilot:suggest',
    'copilot:accept',
    'copilot:dismiss',
    'handoff:request',
    'handoff:assign',
  ],
} as const;
