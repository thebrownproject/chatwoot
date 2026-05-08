import type { Integration } from '../registry.js';

/**
 * Slack integration — bidirectional message sync + link unfurling.
 *
 * Rails source: lib/integrations/slack/ (23 service files)
 *   - SendOnSlackService
 *   - UpdateSlackMessageService
 *   - SlackMessageHelper
 *   - ChannelBuilder
 *   - UnfurlService
 *   - and ~18 more service/helper files
 *
 * Risk: HIGHEST. Plan 1 month of mirror traffic before cutover.
 */
export const slackIntegration: Integration & {
  setupOAuth(account: unknown, params: unknown): Promise<unknown>;
  sendMessage(message: unknown): Promise<unknown>;
  updateMessage(message: unknown): Promise<unknown>;
  unfurlLink(event: unknown): Promise<unknown>;
} = {
  setupOAuth(_account, _params) {
    throw new Error('not implemented');
  },
  setup(_account, _params) {
    throw new Error('not implemented');
  },
  sendMessage(_message) {
    throw new Error('not implemented');
  },
  updateMessage(_message) {
    throw new Error('not implemented');
  },
  unfurlLink(_event) {
    throw new Error('not implemented');
  },
  processEvent(_event) {
    // link unfurl + bidirectional message sync
    throw new Error('not implemented');
  },
  processOutbound(_message) {
    throw new Error('not implemented');
  },
};
