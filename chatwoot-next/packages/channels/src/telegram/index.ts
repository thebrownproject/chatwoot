// Telegram channel adapter.
//
// Rails sources to port:
//   - app/models/channel/telegram.rb
//   - app/services/telegram/incoming_message_service.rb
//   - app/services/telegram/send_on_telegram_service.rb
//   - app/services/telegram/send_attachments_service.rb
//   - app/services/telegram/update_message_service.rb
//   - app/services/telegram/param_helpers.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const telegramChannelAdapter: ChannelAdapter = {
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
