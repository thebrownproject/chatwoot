// WhatsApp channel adapter — delegates to a provider chosen via
// `channel.provider` (Meta Cloud, 360dialog, etc.).
//
// Rails sources to port:
//   - app/models/channel/whatsapp.rb
//   - app/services/whatsapp/incoming_message_base_service.rb
//   - app/services/whatsapp/incoming_message_service.rb
//   - app/services/whatsapp/incoming_message_whatsapp_cloud_service.rb
//   - app/services/whatsapp/send_on_whatsapp_service.rb
//   - app/services/whatsapp/channel_creation_service.rb
//   - app/services/whatsapp/embedded_signup_service.rb
//   - app/services/whatsapp/webhook_setup_service.rb
//   - app/services/whatsapp/webhook_teardown_service.rb
//   - app/services/whatsapp/template_processor_service.rb

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';
import { pickProvider } from './providers/index.js';
import type {
  InboundWhatsappEvent,
  OutboundWhatsappMessage,
  WhatsappChannelConfig,
} from './providers/base.js';

export type {
  InboundWhatsappEvent,
  InboundWhatsappMessageType,
  InboundWhatsappStatus,
  OutboundWhatsappMessage,
  WhatsappChannelConfig,
  WhatsappProvider,
} from './providers/base.js';
export { normalizePhoneNumber, PHONE_NUMBER_REGEX } from './providers/base.js';
export { cloudProvider } from './providers/cloud.js';
export { dialog360Provider } from './providers/dialog360.js';
export { pickProvider } from './providers/index.js';

// Bridge `ChannelConfig` (generic blob from DB) to the typed
// `WhatsappChannelConfig` consumed by providers. Caller wires the
// `channel_whatsapp` row into this shape.
function toWhatsappConfig(channel: ChannelConfig): WhatsappChannelConfig {
  return channel as unknown as WhatsappChannelConfig;
}

function rawBodyToString(rawBody: Buffer | string): string {
  return typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
}

function toFetchHeaders(
  headers: Record<string, string | string[] | undefined>,
): Headers {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) out.append(key, v);
    } else {
      out.set(key, value);
    }
  }
  return out;
}

// Convert a normalized WhatsApp event to the generic `InboundEvent` used by
// the rest of the platform. Status events are filtered out at the provider
// layer; this helper only handles message events for now.
function toGenericInboundEvent(event: InboundWhatsappEvent): InboundEvent {
  if (event.kind !== 'message') {
    return {
      channelType: 'Channel::Whatsapp',
      externalId: event.kind === 'status' ? event.messageId : '',
      contact: { externalId: '' },
      message: {},
      raw: event,
    };
  }
  const payload = event.payload as { text?: { body?: string } } | undefined;
  const content = payload?.text?.body;
  return {
    channelType: 'Channel::Whatsapp',
    externalId: event.messageId,
    contact: { externalId: event.from, phoneNumber: event.from },
    message: content === undefined ? {} : { content },
    raw: event,
  };
}

function toOutboundWhatsappMessage(message: OutboundMessage): OutboundWhatsappMessage {
  // Minimal mapping — the orchestrator passes a hydrated message; we coerce
  // the normalized fields into a text or template payload. Richer types are
  // built upstream once the conversation/contact context is resolved.
  const to = (message as { to?: string }).to ?? '';
  if (message.templateParams) {
    const template = message.templateParams as {
      name: string;
      language: string;
      components?: unknown[];
    };
    return { to, type: 'template', template };
  }
  return {
    to,
    type: 'text',
    text: { body: message.content ?? '' },
  };
}

export const whatsappAdapter: ChannelAdapter = {
  verifyWebhookSignature(req: WebhookRequest): boolean {
    // Channel lookup happens upstream; the resolved row is attached to the
    // request body or query for now. The Rails handler resolves channels by
    // `phone_number` from the URL path.
    const channel = (req as { channel?: ChannelConfig }).channel;
    if (!channel) return false;
    const provider = pickProvider(toWhatsappConfig(channel));
    return provider.verifyWebhookSignature(
      rawBodyToString(req.rawBody),
      toFetchHeaders(req.headers),
      toWhatsappConfig(channel),
    );
  },

  async parseInbound(req: WebhookRequest): Promise<InboundEvent> {
    const channel = (req as { channel?: ChannelConfig }).channel;
    if (!channel) throw new Error('whatsapp parseInbound requires channel context');
    const provider = pickProvider(toWhatsappConfig(channel));
    const events = provider.parseInbound(req.body, toWhatsappConfig(channel));
    const first = events.find((e) => e.kind === 'message') ?? events[0];
    if (!first) {
      return {
        channelType: 'Channel::Whatsapp',
        externalId: '',
        contact: { externalId: '' },
        message: {},
        raw: req.body,
      };
    }
    return toGenericInboundEvent(first);
  },

  async sendOutbound(
    message: OutboundMessage,
    channel: ChannelConfig,
  ): Promise<{ externalId: string }> {
    const config = toWhatsappConfig(channel);
    const provider = pickProvider(config);
    return provider.sendOutbound(toOutboundWhatsappMessage(message), config);
  },

  async setupChannel(
    _params: Record<string, unknown>,
  ): Promise<{ channelId: bigint }> {
    throw new Error('not implemented');
  },
};
