/** Configuration for an email channel */
export interface EmailConfig {
  provider: 'sendgrid' | 'postmark';
  apiKey: string;
  fromAddress: string;
  fromName: string;
  replyToAddress?: string;
  /** Domain used for generating Message-IDs */
  domain: string;
  /** Webhook signing secret for verifying inbound webhooks */
  webhookSecret?: string;
}

/** Parsed inbound email from a webhook payload */
export interface InboundEmail {
  messageId: string;
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  attachments: EmailAttachment[];
  rawHeaders: Record<string, string>;
}

/** Outbound email ready for delivery */
export interface OutboundEmail {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: EmailAttachment[];
}

/** Email attachment metadata */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  content?: string;
}

/** Email headers used for threading */
export interface EmailHeaders {
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  from: string;
  subject: string;
}

/** Result of sending an email */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Channel adapter interface — contract for all channel types */
export interface ChannelAdapter {
  receive(rawWebhook: unknown): InboundEmail;
  deliver(message: MessageForDelivery, channel: ChannelRecord): Promise<SendResult>;
  formatMessage(message: MessageForDelivery): string;
}

/** Minimal message shape needed by the channel adapter for delivery */
export interface MessageForDelivery {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  body: string;
  bodyHtml?: string;
  createdAt: Date;
}

/** Minimal channel record shape (mirrors db schema) */
export interface ChannelRecord {
  id: string;
  type: 'email' | 'web_chat' | 'sms' | 'slack' | 'in_app';
  name: string;
  config: EmailConfig;
  active: boolean;
}

/** Minimal channel conversation record (mirrors db schema) */
export interface ChannelConversationRecord {
  id: string;
  channelId: string;
  conversationId: string;
  externalId: string | null;
  externalMetadata: Record<string, unknown>;
}
