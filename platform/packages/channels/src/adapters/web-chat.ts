import type {
  Attachment,
  ChannelAdapter,
  ChannelConfig,
  DeliveryResult,
  FormattedMessage,
  NormalizedMessage,
  SenderDisplayType,
  UserType,
} from '../types.js';

interface RawWebChatMessage {
  conversationId: string;
  senderId: string;
  senderType?: UserType;
  body: string;
  bodyHtml?: string;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
  timestamp?: string;
}

const SENDER_DISPLAY_TYPE: Record<UserType, SenderDisplayType> = {
  contact: 'contact',
  system: 'system',
  human_agent: 'agent',
  ai_agent: 'agent',
};

function isRawWebChatMessage(raw: unknown): raw is RawWebChatMessage {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj['conversationId'] === 'string' &&
    typeof obj['senderId'] === 'string' &&
    typeof obj['body'] === 'string'
  );
}

export const webChatAdapter: ChannelAdapter = {
  type: 'web_chat',

  receive(raw: unknown): NormalizedMessage {
    if (!isRawWebChatMessage(raw)) {
      throw new Error(
        'Invalid web chat message: requires conversationId, senderId, body',
      );
    }

    return {
      conversationId: raw.conversationId,
      senderId: raw.senderId,
      senderType: raw.senderType ?? 'contact',
      type: 'text',
      visibility: 'public',
      body: raw.body,
      bodyHtml: raw.bodyHtml,
      metadata: raw.metadata,
      attachments: raw.attachments,
      timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    };
  },

  async deliver(
    message: NormalizedMessage,
    _channelConfig: ChannelConfig,
  ): Promise<DeliveryResult> {
    // Web chat delivery happens via WebSocket broadcast in the connection manager.
    // This method returns success — the actual push is handled by ws-server.
    return {
      success: true,
      externalId: `wc_${message.conversationId}_${Date.now()}`,
    };
  },

  formatMessage(
    message: NormalizedMessage,
    sender: { id: string; name: string; avatarUrl?: string | undefined },
  ): FormattedMessage {
    return {
      id: `${message.conversationId}_${message.timestamp.getTime()}`,
      conversationId: message.conversationId,
      sender: {
        id: sender.id,
        name: sender.name,
        avatarUrl: sender.avatarUrl,
        type: SENDER_DISPLAY_TYPE[message.senderType],
      },
      body: message.body,
      bodyHtml: message.bodyHtml,
      timestamp: message.timestamp.toISOString(),
      type: message.type,
      attachments: message.attachments,
    };
  },
};
