import type { Integration } from '../registry.js';

/**
 * Clearbit lookup — Enterprise contact enrichment.
 *
 * Rails source: enterprise/app/services/clearbit_lookup_service.rb
 *
 * Enterprise-only.
 */
export const clearbitIntegration: Integration = {
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
