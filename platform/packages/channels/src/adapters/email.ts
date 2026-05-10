import type {
  ChannelAdapter,
  InboundEmail,
  SendResult,
  MessageForDelivery,
  ChannelRecord,
  OutboundEmail,
} from '../types/email.js';
import type { EmailClient } from '../services/email-client.js';
import { generateMessageId, buildThreadHeaders, type ThreadingDb } from './email-threading.js';
import { sanitizeInboundHtml } from '../sanitize-html.js';

/** Parse error for malformed webhook payloads */
export class EmailParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailParseError';
  }
}

export class EmailAdapter implements ChannelAdapter {
  private emailClient: EmailClient;
  private threadingDb: ThreadingDb;

  constructor(emailClient: EmailClient, threadingDb: ThreadingDb) {
    this.emailClient = emailClient;
    this.threadingDb = threadingDb;
  }

  /**
   * Parse inbound email webhook payload.
   * Handles SendGrid and Postmark formats.
   */
  receive(rawWebhook: unknown): InboundEmail {
    if (!rawWebhook || typeof rawWebhook !== 'object') {
      throw new EmailParseError('Invalid webhook payload: expected an object');
    }

    const payload = rawWebhook as Record<string, unknown>;

    // Detect provider format and delegate
    if (isSendGridPayload(payload)) {
      return parseSendGridPayload(payload);
    }

    if (isPostmarkPayload(payload)) {
      return parsePostmarkPayload(payload);
    }

    throw new EmailParseError('Unrecognised webhook format: not SendGrid or Postmark');
  }

  /**
   * Format and send an outbound email via the configured email service.
   * Sets proper threading headers (Message-ID, In-Reply-To, References).
   */
  async deliver(message: MessageForDelivery, channel: ChannelRecord): Promise<SendResult> {
    if (!message.senderEmail?.trim()) {
      return { success: false, error: 'No recipient email address' };
    }

    const config = channel.config;
    const messageId = generateMessageId(message.conversationId, config.domain);
    const threadHeaders = await buildThreadHeaders(this.threadingDb, message.conversationId);

    const outbound: OutboundEmail = {
      to: message.senderEmail,
      from: config.fromAddress,
      fromName: config.fromName,
      replyTo: config.replyToAddress ?? config.fromAddress,
      subject: `Re: Conversation #${message.conversationId.slice(0, 8)}`,
      bodyText: message.body,
      bodyHtml: this.formatMessage(message),
      messageId,
      inReplyTo: threadHeaders.inReplyTo,
      references: threadHeaders.references,
    };

    return this.emailClient.send(outbound);
  }

  /**
   * Convert internal Message to an HTML email body.
   * Simple, professional template.
   */
  formatMessage(message: MessageForDelivery): string {
    const body = message.bodyHtml ?? escapeHtml(message.body);
    const timestamp = message.createdAt.toISOString();

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="margin-bottom: 16px;">
    ${body}
  </div>
  <div style="border-top: 1px solid #e5e5e5; padding-top: 12px; margin-top: 24px; font-size: 12px; color: #6b7280;">
    <p>${escapeHtml(message.senderName)} &middot; ${timestamp}</p>
  </div>
</body>
</html>`;
  }
}

// ---------------------------------------------------------------------------
// SendGrid inbound parse
// ---------------------------------------------------------------------------

function isSendGridPayload(payload: Record<string, unknown>): boolean {
  // SendGrid inbound parse sends: from, to, subject, text, html, headers
  return typeof payload['from'] === 'string' && typeof payload['headers'] === 'string';
}

function parseSendGridPayload(payload: Record<string, unknown>): InboundEmail {
  const rawHeaders = parseRawHeaders(payload['headers'] as string);
  const from = extractEmailAddress(payload['from'] as string).toLowerCase();
  const fromName = extractEmailName(payload['from'] as string);

  if (!from) {
    throw new EmailParseError('Missing or invalid "from" field in SendGrid payload');
  }

  const to = parseRecipientList(payload['to'] as string | undefined).map(e => e.toLowerCase());
  const subject = (payload['subject'] as string) ?? '(no subject)';
  const bodyText = (payload['text'] as string) ?? '';
  const bodyHtml = payload['html'] as string | undefined;

  return {
    messageId: rawHeaders['message-id'] ?? generateFallbackMessageId(),
    from,
    fromName,
    to,
    subject,
    bodyText,
    bodyHtml: bodyHtml ? sanitizeInboundHtml(bodyHtml) : undefined,
    inReplyTo: rawHeaders['in-reply-to'] ?? undefined,
    references: rawHeaders['references']?.split(/\s+/).filter(Boolean),
    attachments: parseSendGridAttachments(payload),
    rawHeaders,
  };
}

// ---------------------------------------------------------------------------
// Postmark inbound parse
// ---------------------------------------------------------------------------

function isPostmarkPayload(payload: Record<string, unknown>): boolean {
  // Postmark sends: FromFull, ToFull, Subject, TextBody, HtmlBody, Headers
  return typeof payload['FromFull'] === 'object' || typeof payload['From'] === 'string';
}

function parsePostmarkPayload(payload: Record<string, unknown>): InboundEmail {
  const fromFull = payload['FromFull'] as { Email?: string; Name?: string } | undefined;
  const from = (fromFull?.Email ?? extractEmailAddress((payload['From'] as string) ?? '')).toLowerCase();
  const fromName = fromFull?.Name ?? extractEmailName((payload['From'] as string) ?? '');

  if (!from) {
    throw new EmailParseError('Missing or invalid "From" field in Postmark payload');
  }

  const toFull = payload['ToFull'] as Array<{ Email?: string }> | undefined;
  const to = (toFull?.map((r) => r.Email ?? '').filter(Boolean) ?? []).map(e => e.toLowerCase());

  const subject = (payload['Subject'] as string) ?? '(no subject)';
  const bodyText = (payload['TextBody'] as string) ?? '';
  const bodyHtml = payload['HtmlBody'] as string | undefined;

  const headers = parsePostmarkHeaders(payload['Headers'] as PostmarkHeader[] | undefined);
  const messageId = (payload['MessageID'] as string) ?? headers['message-id'] ?? generateFallbackMessageId();

  return {
    messageId,
    from,
    fromName,
    to,
    subject,
    bodyText,
    bodyHtml: bodyHtml ? sanitizeInboundHtml(bodyHtml) : undefined,
    inReplyTo: headers['in-reply-to'] ?? undefined,
    references: headers['references']?.split(/\s+/).filter(Boolean),
    attachments: parsePostmarkAttachments(payload),
    rawHeaders: headers,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface PostmarkHeader {
  Name: string;
  Value: string;
}

function parsePostmarkHeaders(
  headers: PostmarkHeader[] | undefined,
): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};
  for (const h of headers) {
    result[h.Name.toLowerCase()] = stripAngleBrackets(h.Value);
  }
  return result;
}

function parseRawHeaders(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    if (/^\s/.test(line)) {
      // Continuation of previous header
      currentValue += ' ' + line.trim();
    } else {
      if (currentKey) {
        result[currentKey.toLowerCase()] = stripAngleBrackets(currentValue.trim());
      }
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        currentKey = line.slice(0, colonIndex);
        currentValue = line.slice(colonIndex + 1);
      }
    }
  }
  if (currentKey) {
    result[currentKey.toLowerCase()] = stripAngleBrackets(currentValue.trim());
  }

  return result;
}

function stripAngleBrackets(value: string): string {
  return value.replace(/[<>]/g, '');
}

function extractEmailAddress(fromField: string): string {
  const match = fromField.match(/<([^>]+)>/);
  if (match) return match[1];
  // Bare email address
  if (fromField.includes('@')) return fromField.trim();
  return '';
}

function extractEmailName(fromField: string): string | undefined {
  const match = fromField.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/^"|"$/g, '');
  return undefined;
}

function parseRecipientList(to: string | undefined): string[] {
  if (!to) return [];
  return to.split(',').map((addr) => extractEmailAddress(addr.trim())).filter(Boolean);
}

function generateFallbackMessageId(): string {
  return `${crypto.randomUUID()}@inbound.local`;
}

// Re-export sanitizeInboundHtml so existing imports from this module continue to work
export { sanitizeInboundHtml } from '../sanitize-html.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function parseSendGridAttachments(payload: Record<string, unknown>): InboundEmail['attachments'] {
  const count = Number(payload['attachments']) || 0;
  if (count === 0) return [];

  const info = payload['attachment-info'] as Record<string, { filename?: string; type?: string; 'content-length'?: string }> | undefined;
  if (!info) return [];

  const attachments: InboundEmail['attachments'] = [];
  for (let i = 1; i <= count; i++) {
    const entry = info[`attachment${i}`];
    if (entry) {
      attachments.push({
        filename: entry.filename ?? `attachment${i}`,
        contentType: entry.type ?? 'application/octet-stream',
        size: Number(entry['content-length']) || 0,
      });
    }
  }

  return attachments;
}

function parsePostmarkAttachments(payload: Record<string, unknown>): InboundEmail['attachments'] {
  const raw = payload['Attachments'] as Array<{
    Name?: string;
    ContentType?: string;
    ContentLength?: number;
  }> | undefined;
  if (!raw) return [];

  return raw.map((a) => ({
    filename: a.Name ?? 'attachment',
    contentType: a.ContentType ?? 'application/octet-stream',
    size: a.ContentLength ?? 0,
  }));
}
