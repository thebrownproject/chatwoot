// Twitter DM channel adapter.
//
// Rails sources to port:
//   - app/models/channel/twitter_profile.rb
//   - app/services/twitter/direct_message_parser_service.rb
//   - app/services/twitter/send_on_twitter_service.rb
//   - app/services/twitter/tweet_parser_service.rb
//   - app/services/twitter/webhook_subscribe_service.rb
//   - app/services/twitter/webhooks_base_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const twitterChannelAdapter: ChannelAdapter = {
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
