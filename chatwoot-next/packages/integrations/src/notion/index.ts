import type { Integration } from '../registry.js';

/**
 * Notion integration — OAuth + page lookup.
 *
 * Rails source: lib/integrations/notion/
 */
export const notionIntegration: Integration = {
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
