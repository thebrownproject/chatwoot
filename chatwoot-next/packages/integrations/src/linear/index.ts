import type { Integration } from '../registry.js';

/**
 * Linear integration — issue tracker linking.
 *
 * Rails source: lib/integrations/linear/
 */
export const linearIntegration: Integration = {
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
