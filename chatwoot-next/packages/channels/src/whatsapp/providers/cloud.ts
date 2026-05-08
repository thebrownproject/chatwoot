// WhatsApp Cloud (Meta) provider.
//
// Rails sources:
//   - app/services/whatsapp/providers/whatsapp_cloud_service.rb
//   - app/services/whatsapp/incoming_message_whatsapp_cloud_service.rb
//   - app/controllers/webhooks/whatsapp_controller.rb
//   - app/controllers/concerns/meta_token_verify_concern.rb
//
// Webhook signature verification: Meta signs the raw request body with
// HMAC-SHA256 using the app secret and includes the digest in the
// `X-Hub-Signature-256` header as `sha256=<hex>`.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  InboundWhatsappEvent,
  InboundWhatsappMessageType,
  InboundWhatsappStatus,
  OutboundWhatsappMessage,
  WhatsappChannelConfig,
  WhatsappProvider,
} from './base.js';

const DEFAULT_API_BASE_URL = 'https://graph.facebook.com';
const GRAPH_API_VERSION = 'v21.0';

function readSignatureHeader(headers: Headers): string | null {
  // `Headers.get` is case-insensitive on the WHATWG fetch Headers type.
  const raw = headers.get('x-hub-signature-256') ?? headers.get('X-Hub-Signature-256');
  if (!raw) return null;
  return raw.startsWith('sha256=') ? raw.slice('sha256='.length) : raw;
}

function buildOutboundBody(message: OutboundWhatsappMessage): Record<string, unknown> {
  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: message.to,
    type: message.type,
  };
  if (message.context) {
    body.context = { message_id: message.context.messageId };
  }
  switch (message.type) {
    case 'text':
      if (message.text) body.text = message.text;
      break;
    case 'template':
      if (message.template) {
        body.template = {
          name: message.template.name,
          language: { policy: 'deterministic', code: message.template.language },
          components: message.template.components ?? [],
        };
      }
      break;
    case 'image':
      if (message.image) body.image = message.image;
      break;
    case 'document':
      if (message.document) body.document = message.document;
      break;
    case 'audio':
      if (message.audio) body.audio = message.audio;
      break;
    case 'video':
      if (message.video) body.video = message.video;
      break;
    case 'interactive':
      if (message.interactive) body.interactive = message.interactive;
      break;
  }
  return body;
}

type CloudWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: unknown;
        contacts?: unknown[];
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: InboundWhatsappMessageType;
          [key: string]: unknown;
        }>;
        statuses?: Array<{
          id: string;
          recipient_id: string;
          status: InboundWhatsappStatus;
          timestamp: string;
          [key: string]: unknown;
        }>;
      };
    }>;
  }>;
};

export const cloudProvider: WhatsappProvider = {
  verifyWebhookSignature(
    rawBody: string,
    headers: Headers,
    channelConfig: WhatsappChannelConfig,
  ): boolean {
    const headerSig = readSignatureHeader(headers);
    if (!headerSig) return false;

    const computed = createHmac('sha256', channelConfig.appSecret)
      .update(rawBody)
      .digest('hex');

    // Guard against length mismatch — `timingSafeEqual` throws otherwise.
    if (headerSig.length !== computed.length) return false;

    const headerBuf = Buffer.from(headerSig, 'hex');
    const computedBuf = Buffer.from(computed, 'hex');
    if (headerBuf.length !== computedBuf.length || headerBuf.length === 0) return false;

    return timingSafeEqual(headerBuf, computedBuf);
  },

  parseInbound(
    payload: unknown,
    _channelConfig: WhatsappChannelConfig,
  ): InboundWhatsappEvent[] {
    const events: InboundWhatsappEvent[] = [];
    const typed = payload as CloudWebhookPayload;

    if (!typed || typeof typed !== 'object' || !Array.isArray(typed.entry)) {
      return [{ kind: 'unknown', raw: payload }];
    }

    for (const entry of typed.entry) {
      if (!entry || !Array.isArray(entry.changes)) continue;
      for (const change of entry.changes) {
        const value = change?.value;
        if (!value) continue;

        if (Array.isArray(value.messages)) {
          for (const m of value.messages) {
            events.push({
              kind: 'message',
              messageId: m.id,
              from: m.from,
              timestamp: parseInt(m.timestamp, 10),
              type: m.type,
              payload: m,
            });
          }
        }

        if (Array.isArray(value.statuses)) {
          for (const s of value.statuses) {
            events.push({
              kind: 'status',
              messageId: s.id,
              recipient: s.recipient_id,
              status: s.status,
              timestamp: parseInt(s.timestamp, 10),
            });
          }
        }
      }
    }

    if (events.length === 0) {
      events.push({ kind: 'unknown', raw: payload });
    }
    return events;
  },

  async sendOutbound(
    message: OutboundWhatsappMessage,
    channelConfig: WhatsappChannelConfig,
  ): Promise<{ externalId: string }> {
    const baseUrl = channelConfig.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    const url = `${baseUrl}/${GRAPH_API_VERSION}/${channelConfig.phoneNumberId}/messages`;
    const body = buildOutboundBody(message);

    const response = await globalThis.fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let parsed: unknown = null;
      try {
        parsed = await response.json();
      } catch {
        parsed = await response.text().catch(() => null);
      }
      throw new Error(
        `WhatsApp Cloud API error ${response.status}: ${JSON.stringify(parsed)}`,
      );
    }

    const json = (await response.json()) as {
      messages?: Array<{ id: string }>;
    };
    const externalId = json.messages?.[0]?.id;
    if (!externalId) {
      throw new Error(
        `WhatsApp Cloud API response missing message id: ${JSON.stringify(json)}`,
      );
    }
    return { externalId };
  },

  verifySubscription(
    searchParams: URLSearchParams,
    channelConfig: WhatsappChannelConfig,
  ): { ok: true; challenge: string } | { ok: false } {
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (
      mode === 'subscribe' &&
      token === channelConfig.webhookVerifyToken &&
      challenge !== null
    ) {
      return { ok: true, challenge };
    }
    return { ok: false };
  },
};
