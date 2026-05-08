// Instagram channel adapter (DM + feed comments).
//
// Rails sources to port:
//   - app/models/channel/instagram.rb
//   - app/services/instagram/base_message_text.rb
//   - app/services/instagram/base_send_service.rb
//   - app/services/instagram/message_text.rb
//   - app/services/instagram/messenger/message_text.rb
//   - app/services/instagram/messenger/send_on_instagram_service.rb
//   - app/services/instagram/read_status_service.rb
//   - app/services/instagram/refresh_oauth_token_service.rb
//   - app/services/instagram/send_on_instagram_service.rb
//   - app/services/instagram/test_event_service.rb
//   - app/services/instagram/webhooks_base_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const instagramChannelAdapter: ChannelAdapter = {
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
