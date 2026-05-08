// Shared channel types. Mirror Rails STI subclasses in app/models/channel/.

export type ChannelType =
  | 'Channel::Api'
  | 'Channel::Email'
  | 'Channel::FacebookPage'
  | 'Channel::Instagram'
  | 'Channel::Line'
  | 'Channel::Sms'
  | 'Channel::Telegram'
  | 'Channel::TikTok'
  | 'Channel::TwilioSms'
  | 'Channel::TwitterProfile'
  | 'Channel::WebWidget'
  | 'Channel::Whatsapp'
  | 'Channel::Voice';

export interface ChannelConfig {
  channelType: ChannelType;
  // Provider-specific configuration blob. Shape is owned by each adapter.
  // For WhatsApp this carries `provider` ('whatsapp_cloud' | 'default' (360dialog) | 'whatsapp_baileys' etc.).
  [key: string]: unknown;
}

export interface InboundEvent {
  channelType: ChannelType;
  externalId: string;
  // Parsed contact + message payload normalized across providers.
  contact: {
    externalId: string;
    name?: string;
    phoneNumber?: string;
    email?: string;
  };
  message: {
    content?: string;
    attachments?: Array<{ url: string; type: string }>;
    inReplyToExternalId?: string;
  };
  raw: unknown;
}

export interface OutboundMessage {
  conversationId: bigint;
  content?: string;
  attachments?: Array<{ url: string; type: string }>;
  templateParams?: Record<string, unknown>;
}

// Minimal request shape used by webhook verification + parsing. Keep
// transport-agnostic so adapters can run under fastify, hono, or workers.
export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer | string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface ChannelAdapter {
  verifyWebhookSignature(req: WebhookRequest): boolean;
  parseInbound(req: WebhookRequest): Promise<InboundEvent>;
  sendOutbound(
    message: OutboundMessage,
    channel: ChannelConfig,
  ): Promise<{ externalId: string }>;
  setupChannel(params: Record<string, unknown>): Promise<{ channelId: bigint }>;
}
