// TikTok channel adapter.
//
// Rails sources to port:
//   - app/models/channel/tiktok.rb
//   - app/services/tiktok/auth_client.rb
//   - app/services/tiktok/client.rb
//   - app/services/tiktok/message_service.rb
//   - app/services/tiktok/messaging_helpers.rb
//   - app/services/tiktok/read_status_service.rb
//   - app/services/tiktok/send_on_tiktok_service.rb
//   - app/services/tiktok/token_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const tiktokChannelAdapter: ChannelAdapter = {
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
