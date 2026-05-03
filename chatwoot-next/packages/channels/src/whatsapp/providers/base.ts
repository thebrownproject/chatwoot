// Shared WhatsApp provider interface + helpers.
//
// Rails sources:
//   - app/services/whatsapp/providers/base_service.rb
//   - app/services/whatsapp/phone_normalizers/base_phone_normalizer.rb
//   - app/controllers/webhooks/whatsapp_controller.rb
//   - app/controllers/concerns/meta_token_verify_concern.rb

export type WhatsappChannelConfig = {
  provider: 'whatsapp_cloud' | '360dialog';
  phoneNumber: string;
  phoneNumberId: string; // Meta Cloud
  businessAccountId: string; // Meta Cloud
  webhookVerifyToken: string; // Meta Cloud subscription verification
  appSecret: string; // Meta Cloud signature verification
  apiKey: string; // 360dialog / Meta Cloud bearer token
  apiBaseUrl?: string; // override for 360dialog or testing
};

export type InboundWhatsappMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contacts'
  | 'button'
  | 'interactive'
  | 'reaction'
  | 'sticker';

export type InboundWhatsappStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type InboundWhatsappEvent =
  | {
      kind: 'message';
      messageId: string;
      from: string;
      timestamp: number;
      type: InboundWhatsappMessageType;
      payload: unknown;
    }
  | {
      kind: 'status';
      messageId: string;
      recipient: string;
      status: InboundWhatsappStatus;
      timestamp: number;
    }
  | { kind: 'unknown'; raw: unknown };

export type OutboundWhatsappMessage = {
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'interactive';
  text?: { body: string };
  template?: { name: string; language: string; components?: unknown[] };
  image?: { link: string; caption?: string };
  document?: { link: string; caption?: string; filename?: string };
  audio?: { link: string };
  video?: { link: string; caption?: string };
  interactive?: unknown;
  context?: { messageId: string };
};

export interface WhatsappProvider {
  /** Verify a webhook request's authenticity. Returns true on match. */
  verifyWebhookSignature(
    rawBody: string,
    headers: Headers,
    channelConfig: WhatsappChannelConfig,
  ): boolean;
  /** Parse a verified webhook payload into normalized inbound events. */
  parseInbound(
    payload: unknown,
    channelConfig: WhatsappChannelConfig,
  ): InboundWhatsappEvent[];
  /** Send an outbound message. */
  sendOutbound(
    message: OutboundWhatsappMessage,
    channelConfig: WhatsappChannelConfig,
  ): Promise<{ externalId: string }>;
  /** Handle Meta's GET-mode subscription verification (echoes hub.challenge). */
  verifySubscription(
    searchParams: URLSearchParams,
    channelConfig: WhatsappChannelConfig,
  ): { ok: true; challenge: string } | { ok: false };
}

// E.164 phone number regex.
export const PHONE_NUMBER_REGEX = /^\+?[1-9]\d{1,14}$/;

// Source: app/services/whatsapp/phone_normalizers/base_phone_normalizer.rb
// Strip non-digits except leading `+`. If no leading `+`, prepend one.
export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}
