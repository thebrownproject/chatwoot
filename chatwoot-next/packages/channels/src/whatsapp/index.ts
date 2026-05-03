// WhatsApp channel adapter — delegates to a provider chosen via
// `channel.provider` (Meta Cloud, 360dialog, etc.).
//
// Rails sources to port:
//   - app/models/channel/whatsapp.rb
//   - app/services/whatsapp/incoming_message_base_service.rb
//   - app/services/whatsapp/incoming_message_service.rb
//   - app/services/whatsapp/incoming_message_whatsapp_cloud_service.rb
//   - app/services/whatsapp/send_on_whatsapp_service.rb
//   - app/services/whatsapp/channel_creation_service.rb
//   - app/services/whatsapp/embedded_signup_service.rb
//   - app/services/whatsapp/webhook_setup_service.rb
//   - app/services/whatsapp/webhook_teardown_service.rb
//   - app/services/whatsapp/template_processor_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';
import { pickProvider } from './providers/index.js';

export const whatsappAdapter: ChannelAdapter = {
  verifyWebhookSignature(req: WebhookRequest): boolean {
    // Provider is encoded in the URL/headers in some flows; for signature
    // verification we may not have the channel record yet. The full impl
    // will look up the channel by phone number id and dispatch.
    void req;
    void pickProvider;
    throw new Error('not implemented');
  },
  async parseInbound(req: WebhookRequest): Promise<InboundEvent> {
    void req;
    throw new Error('not implemented');
  },
  async sendOutbound(
    message: OutboundMessage,
    channel: ChannelConfig,
  ): Promise<{ externalId: string }> {
    const provider = pickProvider(channel);
    return provider.sendOutbound(message, channel);
  },
  async setupChannel(
    _params: Record<string, unknown>,
  ): Promise<{ channelId: bigint }> {
    throw new Error('not implemented');
  },
};
