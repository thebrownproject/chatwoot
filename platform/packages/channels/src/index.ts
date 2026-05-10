// Public entrypoint for @buildpass/channels.

// Types
export type {
  Attachment,
  ChannelType,
  ChannelConfig,
  ChannelAdapter,
  NormalizedMessage,
  DeliveryResult,
  FormattedMessage,
  SenderDisplayType,
  UserType,
  MessageVisibility,
  MessageType,
  WsClientEvent,
  WsServerEvent,
} from './types.js';

export {
  channelTypeEnum,
  userTypeEnum,
  messageVisibilityEnum,
  messageTypeEnum,
  createChannelSchema,
  updateChannelSchema,
  createWidgetConversationSchema,
  createWidgetMessageSchema,
  wsClientEventSchema,
} from './types.js';

// Registry
export { registerAdapter, getAdapter, listAdapters, clearAdapters } from './registry.js';

// Adapters
export { webChatAdapter } from './adapters/web-chat.js';

// Realtime
export { ConnectionManager } from './realtime/connection-manager.js';
export { createWsServer } from './realtime/ws-server.js';

// Data access
export {
  createChannelDb,
  createChannel,
  getChannelById,
  listChannels,
  updateChannel,
  deactivateChannel,
} from './data/channels.js';
export type { ChannelDb } from './data/channels.js';

// Routes
export { channelRoutes } from './routes/channels.js';
export { widgetRoutes, createWidgetStore } from './routes/widget.js';
export type { WidgetStore } from './routes/widget.js';

// Manifest
export { manifest } from './manifest.js';

// ── Email Channel Adapter (PR #10) ──

export { EmailAdapter, EmailParseError, sanitizeInboundHtml } from './adapters/email.js';
export { sanitizeInboundHtmlRegex } from './sanitize-html.js';
export {
  matchToConversation,
  generateMessageId,
  buildThreadHeaders,
  normaliseSubject,
  type ThreadingDb,
} from './adapters/email-threading.js';
export { SendGridClient, type EmailClient } from './services/email-client.js';
export {
  emailWebhookRoutes,
  type NewConversationData,
  type NewMessageData,
} from './routes/email-webhook.js';
export type {
  EmailConfig,
  InboundEmail,
  OutboundEmail,
  EmailAttachment,
  EmailHeaders,
  SendResult,
  ChannelAdapter as EmailChannelAdapter,
  MessageForDelivery,
  ChannelRecord,
  ChannelConversationRecord,
} from './types/email.js';
