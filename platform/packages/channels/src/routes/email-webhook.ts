import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { EmailAdapter, EmailParseError } from '../adapters/email.js';
import { matchToConversation, type ThreadingDb } from '../adapters/email-threading.js';

/**
 * Dependencies injected via Hono env variables.
 * Set these via middleware before mounting this route.
 */
type Env = {
  Variables: {
    emailAdapter: EmailAdapter;
    threadingDb: ThreadingDb;
    /** Callback to create a conversation + message when a new email arrives */
    onNewConversation: (data: NewConversationData) => Promise<{ conversationId: string }>;
    /** Callback to add a message to an existing conversation */
    onNewMessage: (data: NewMessageData) => Promise<void>;
    /** Webhook signing secret for verification (optional) */
    webhookSecret?: string;
  };
};

export interface NewConversationData {
  channelOrigin: 'email';
  subject: string;
  contactEmail: string;
  contactName?: string;
  body: string;
  bodyHtml?: string;
  messageId: string;
  channelId: string;
}

export interface NewMessageData {
  conversationId: string;
  contactEmail: string;
  contactName?: string;
  body: string;
  bodyHtml?: string;
  messageId: string;
}

/**
 * Email webhook routes.
 * Mount with: `app.route('/webhooks/email', emailWebhookRoutes)`
 */
export const emailWebhookRoutes = new Hono<Env>();

// ---------------------------------------------------------------------------
// POST /webhooks/email/inbound — receive inbound email
// ---------------------------------------------------------------------------

emailWebhookRoutes.post('/inbound', async (c) => {
  const adapter = c.get('emailAdapter');
  const threadingDb = c.get('threadingDb');
  const onNewConversation = c.get('onNewConversation');
  const onNewMessage = c.get('onNewMessage');
  const webhookSecret = c.get('webhookSecret');

  // Verify webhook signature if a secret is configured
  if (webhookSecret) {
    const isValid = verifyWebhookSignature(c.req, webhookSecret);
    if (!isValid) {
      return c.json({ error: 'Invalid webhook signature' }, 401);
    }
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Parse the inbound email
  let inboundEmail;
  try {
    inboundEmail = adapter.receive(body);
  } catch (err) {
    if (err instanceof EmailParseError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }

  // Try to match to an existing conversation
  const match = await matchToConversation(threadingDb, {
    messageId: inboundEmail.messageId,
    inReplyTo: inboundEmail.inReplyTo,
    references: inboundEmail.references,
    from: inboundEmail.from,
    subject: inboundEmail.subject,
  });

  if (match) {
    // Add message to existing conversation
    await onNewMessage({
      conversationId: match.conversationId,
      contactEmail: inboundEmail.from,
      contactName: inboundEmail.fromName,
      body: inboundEmail.bodyText,
      bodyHtml: inboundEmail.bodyHtml,
      messageId: inboundEmail.messageId,
    });
  } else {
    // Create new conversation
    await onNewConversation({
      channelOrigin: 'email',
      subject: inboundEmail.subject,
      contactEmail: inboundEmail.from,
      contactName: inboundEmail.fromName,
      body: inboundEmail.bodyText,
      bodyHtml: inboundEmail.bodyHtml,
      messageId: inboundEmail.messageId,
      channelId: '', // Set by the calling app based on which channel received this
    });
  }

  return c.json({ ok: true }, 200);
});

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verify webhook signature using timing-safe comparison.
 * SendGrid: X-Twilio-Email-Event-Webhook-Signature (ECDSA)
 * Postmark: (basic auth or token comparison)
 *
 * For MVP, we do a simple token comparison against a shared secret
 * passed as a query parameter or header. Production should use
 * provider-specific HMAC/ECDSA verification.
 */
function verifyWebhookSignature(
  req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined },
  secret: string,
): boolean {
  // Check header first, then query param
  const token = req.header('x-webhook-token') ?? req.query('token');
  if (!token) return false;

  // Use timing-safe comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);

  if (tokenBuf.length !== secretBuf.length) return false;
  return timingSafeEqual(tokenBuf, secretBuf);
}
