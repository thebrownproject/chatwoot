// SMS channel adapter (generic + Bandwidth).
//
// Rails sources to port:
//   - app/models/channel/sms.rb
//   - app/services/sms/incoming_message_service.rb
//   - app/services/sms/send_on_sms_service.rb
//   - app/services/sms/delivery_status_service.rb
//   - app/services/sms/oneoff_sms_campaign_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const smsChannelAdapter: ChannelAdapter = {
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
