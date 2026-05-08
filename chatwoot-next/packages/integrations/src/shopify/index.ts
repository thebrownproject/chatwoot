import type { Integration } from '../registry.js';

/**
 * Shopify integration — OAuth + customer lookup.
 *
 * Rails source: lib/integrations/shopify/
 */
export const shopifyIntegration: Integration = {
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
