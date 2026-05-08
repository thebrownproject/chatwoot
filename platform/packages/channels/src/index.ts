export { EmailAdapter, EmailParseError } from './adapters/email.js';
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
  ChannelAdapter,
  MessageForDelivery,
  ChannelRecord,
  ChannelConversationRecord,
} from './types/email.js';
