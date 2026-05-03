import type { Integration } from '../registry.js';

/**
 * Dialogflow integration — bot processor.
 *
 * Rails source: lib/integrations/dialogflow/ProcessorService
 */
export const dialogflowIntegration: Integration = {
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
