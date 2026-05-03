// 360dialog WhatsApp provider.
//
// Rails source: app/services/whatsapp/providers/whatsapp_360_dialog_service.rb

import type {
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../../types.js';
import type { WhatsappProvider } from './base.js';

export const dialog360Provider: WhatsappProvider = {
  async sendOutbound(
    _message: OutboundMessage,
    _channel: ChannelConfig,
  ): Promise<{ externalId: string }> {
    throw new Error('not implemented');
  },
  async parseInbound(_req: WebhookRequest): Promise<InboundEvent> {
    throw new Error('not implemented');
  },
  verifyWebhook(_req: WebhookRequest, _channel: ChannelConfig): boolean {
    throw new Error('not implemented');
  },
};
