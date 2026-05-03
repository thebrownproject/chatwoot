import type { Integration } from '../registry.js';

/**
 * Dyte integration — video calls inside conversations.
 *
 * Rails source: lib/integrations/dyte/
 */
export const dyteIntegration: Integration = {
  setup(_account, _params) {
    throw new Error('not implemented');
  },
  processEvent(_event) {
    throw new Error('not implemented');
  },
  processOutbound(_message) {
    throw new Error('not implemented');
  },
};
