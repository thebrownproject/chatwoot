import { z } from 'zod';

// --- Channel types ---

export const channelTypeEnum = z.enum([
  'email',
  'web_chat',
  'sms',
  'slack',
  'in_app',
]);
export type ChannelType = z.infer<typeof channelTypeEnum>;

export const messageVisibilityEnum = z.enum(['public', 'internal']);
export type MessageVisibility = z.infer<typeof messageVisibilityEnum>;

export const messageTypeEnum = z.enum(['text', 'rich', 'activity']);
export type MessageType = z.infer<typeof messageTypeEnum>;

// --- Shared sub-types ---

export const userTypeEnum = z.enum(['human_agent', 'ai_agent', 'contact', 'system']);
export type UserType = z.infer<typeof userTypeEnum>;

export interface Attachment {
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

// --- Normalized message format (internal representation) ---

export interface NormalizedMessage {
  conversationId: string;
  senderId: string;
  senderType: UserType;
  type: MessageType;
  visibility: MessageVisibility;
  body: string;
  bodyHtml?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  attachments?: Attachment[] | undefined;
  timestamp: Date;
}

// --- Delivery result ---

export interface DeliveryResult {
  success: boolean;
  externalId?: string | undefined;
  error?: string | undefined;
}

// --- Formatted message (ready for channel-specific output) ---

export type SenderDisplayType = 'agent' | 'contact' | 'system';

export interface FormattedMessage {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string | undefined;
    type: SenderDisplayType;
  };
  body: string;
  bodyHtml?: string | undefined;
  timestamp: string; // ISO 8601
  type: MessageType;
  attachments?: Attachment[] | undefined;
}

// --- Channel adapter interface ---

export interface ChannelAdapter {
  readonly type: ChannelType;

  /** Parse raw inbound data into a NormalizedMessage */
  receive(raw: unknown): NormalizedMessage;

  /** Deliver a NormalizedMessage through this channel */
  deliver(
    message: NormalizedMessage,
    channelConfig: ChannelConfig,
  ): Promise<DeliveryResult>;

  /** Format a NormalizedMessage for channel-specific output (strip internal fields, resolve senders) */
  formatMessage(
    message: NormalizedMessage,
    sender: { id: string; name: string; avatarUrl?: string | undefined },
  ): FormattedMessage;
}

// --- Channel config (DB row shape) ---

export interface ChannelConfig {
  id: string;
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Zod schemas for API validation ---

export const createChannelSchema = z.object({
  type: channelTypeEnum,
  name: z.string().min(1).max(255).refine((s) => s.trim().length > 0, { message: 'Name cannot be whitespace-only' }),
  config: z.record(z.unknown()).default({}),
  active: z.boolean().default(true),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(255).refine((s) => s.trim().length > 0, { message: 'Name cannot be whitespace-only' }).optional(),
  config: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

// --- Widget schemas ---

export const createWidgetConversationSchema = z.object({
  channelId: z.string().uuid(),
  contactName: z.string().min(1).max(255).refine((s) => s.trim().length > 0, { message: 'Contact name cannot be whitespace-only' }),
  contactEmail: z.string().email().optional(),
  initialMessage: z.string().min(1).refine((s) => s.trim().length > 0, { message: 'Message cannot be whitespace-only' }).optional(),
});

export const createWidgetMessageSchema = z.object({
  body: z.string().min(1).refine((s) => s.trim().length > 0, { message: 'Message body cannot be whitespace-only' }),
  senderName: z.string().min(1).max(255).refine((s) => s.trim().length > 0, { message: 'Sender name cannot be whitespace-only' }).optional(),
});

// --- WebSocket event types ---

export type WsClientEvent =
  | { type: 'message'; conversationId: string; body: string }
  | { type: 'typing'; conversationId: string; isTyping: boolean }
  | {
      type: 'subscribe';
      conversationId: string;
    }
  | { type: 'unsubscribe'; conversationId: string };

export type WsServerEvent =
  | {
      type: 'message';
      conversationId: string;
      message: FormattedMessage;
    }
  | {
      type: 'typing';
      conversationId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }
  | {
      type: 'presence';
      userId: string;
      status: 'online' | 'offline';
    }
  | { type: 'error'; message: string };

export const wsClientEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message'),
    conversationId: z.string(),
    body: z.string().min(1),
  }),
  z.object({
    type: z.literal('typing'),
    conversationId: z.string(),
    isTyping: z.boolean(),
  }),
  z.object({
    type: z.literal('subscribe'),
    conversationId: z.string(),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    conversationId: z.string(),
  }),
]);
