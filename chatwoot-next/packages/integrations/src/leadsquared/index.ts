import type { Integration } from '../registry.js';

/**
 * LeadSquared CRM integration.
 *
 * Rails source: app/services/crm/leadsquared/ (api clients, mappers, processor)
 */
export const leadsquaredIntegration: Integration = {
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
