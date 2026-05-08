// Facebook Messenger channel adapter.
//
// Rails sources to port:
//   - app/models/channel/facebook_page.rb
//   - app/services/facebook/send_on_facebook_service.rb
//   - lib/integrations/facebook/message_creator.rb
//   - lib/integrations/facebook/message_parser.rb
//   - lib/integrations/facebook/delivery_status.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const facebookChannelAdapter: ChannelAdapter = {
  verifyWebhookSignature(_req: WebhookRequest): boolean {
    throw new Error('not implemented');
  },
  async parseInbound(_req: WebhookRequest): Promise<InboundEvent> {
    throw new Error('not implemented');
  },
  async sendOutbound(
    _message: OutboundMessage,
    _channel: ChannelConfig,
  ): Promise<{ externalId: string }> {
    throw new Error('not implemented');
  },
  async setupChannel(
    _params: Record<string, unknown>,
  ): Promise<{ channelId: bigint }> {
    throw new Error('not implemented');
  },
};
