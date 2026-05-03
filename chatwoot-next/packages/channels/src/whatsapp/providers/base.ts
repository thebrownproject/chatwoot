// Shared WhatsApp provider interface + helpers.
//
// Rails source: app/services/whatsapp/providers/base_service.rb

import type {
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../../types.js';

export interface WhatsappProvider {
  sendOutbound(
    message: OutboundMessage,
    channel: ChannelConfig,
  ): Promise<{ externalId: string }>;
  parseInbound(req: WebhookRequest): Promise<InboundEvent>;
  verifyWebhook(req: WebhookRequest, channel: ChannelConfig): boolean;
}

// Shared helpers — phone normalization, template rendering, etc. The Rails
// equivalents live in app/services/whatsapp/phone_normalizers/ and
// template_processor_service.rb.

export function normalizePhoneNumber(_input: string): string {
  throw new Error('not implemented');
}

export function renderTemplate(
  _templateName: string,
  _params: Record<string, unknown>,
): string {
  throw new Error('not implemented');
}
