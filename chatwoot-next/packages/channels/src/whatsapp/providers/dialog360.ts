// 360dialog WhatsApp provider.
//
// Rails source: app/services/whatsapp/providers/whatsapp_360_dialog_service.rb
//
// Stub for now — next channel to port. Cloud provider is the template.

import type {
  InboundWhatsappEvent,
  OutboundWhatsappMessage,
  WhatsappChannelConfig,
  WhatsappProvider,
} from './base.js';

export const dialog360Provider: WhatsappProvider = {
  verifyWebhookSignature(
    _rawBody: string,
    _headers: Headers,
    _channelConfig: WhatsappChannelConfig,
  ): boolean {
    throw new Error('not implemented');
  },
  parseInbound(
    _payload: unknown,
    _channelConfig: WhatsappChannelConfig,
  ): InboundWhatsappEvent[] {
    throw new Error('not implemented');
  },
  async sendOutbound(
    _message: OutboundWhatsappMessage,
    _channelConfig: WhatsappChannelConfig,
  ): Promise<{ externalId: string }> {
    throw new Error('not implemented');
  },
  verifySubscription(
    _searchParams: URLSearchParams,
    _channelConfig: WhatsappChannelConfig,
  ): { ok: true; challenge: string } | { ok: false } {
    throw new Error('not implemented');
  },
};
