import type { Integration } from '../registry.js';

/**
 * Google Translate integration — message translation.
 *
 * Rails source: lib/integrations/google_translate/
 */
export const googleTranslateIntegration: Integration = {
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
