// Twilio SMS channel adapter.
//
// Rails sources to port:
//   - app/models/channel/twilio_sms.rb
//   - app/services/twilio/incoming_message_service.rb
//   - app/services/twilio/send_on_twilio_service.rb
//   - app/services/twilio/delivery_status_service.rb
//   - app/services/twilio/webhook_setup_service.rb
//   - app/services/twilio/oneoff_sms_campaign_service.rb
//   - app/services/twilio/template_processor_service.rb
//   - app/services/twilio/template_sync_service.rb
//   - app/services/twilio/csat_template_api_client.rb
//   - app/services/twilio/csat_template_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const twilioSmsChannelAdapter: ChannelAdapter = {
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
