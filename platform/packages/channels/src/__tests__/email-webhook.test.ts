import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { emailWebhookRoutes, type NewConversationData, type NewMessageData } from '../routes/email-webhook.js';
import { EmailAdapter } from '../adapters/email.js';
import type { ThreadingDb } from '../adapters/email-threading.js';
import type { EmailClient } from '../services/email-client.js';
import type { ChannelConversationRecord } from '../types/email.js';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function createTestApp(options: {
  threadingMatch?: ChannelConversationRecord | null;
  webhookSecret?: string;
} = {}) {
  const onNewConversation = vi.fn<[NewConversationData], Promise<{ conversationId: string }>>(
    async () => ({ conversationId: 'new-conv-id' }),
  );
  const onNewMessage = vi.fn<[NewMessageData], Promise<void>>(async () => {});

  const mockClient: EmailClient = {
    send: async () => ({ success: true, messageId: 'out-1' }),
  };

  const mockThreadingDb: ThreadingDb = {
    findChannelConversationByExternalId: async () => options.threadingMatch ?? null,
    findChannelConversationsByMetadata: async () =>
      options.threadingMatch ? [options.threadingMatch] : [],
    findChannelConversationBySubjectAndSender: async () => null,
    getChannelConversationsByConversation: async () => [],
  };

  const adapter = new EmailAdapter(mockClient, mockThreadingDb);

  const app = new Hono();

  // Inject dependencies via middleware
  app.use('*', async (c, next) => {
    c.set('emailAdapter' as never, adapter);
    c.set('threadingDb' as never, mockThreadingDb);
    c.set('onNewConversation' as never, onNewConversation);
    c.set('onNewMessage' as never, onNewMessage);
    if (options.webhookSecret) {
      c.set('webhookSecret' as never, options.webhookSecret);
    }
    await next();
  });

  app.route('/webhooks/email', emailWebhookRoutes);

  return { app, onNewConversation, onNewMessage };
}

// Sample SendGrid payload
const sendGridPayload = {
  from: 'Customer <customer@example.com>',
  to: 'support@buildpass.com.au',
  subject: 'Help with compliance',
  text: 'I need help.',
  html: '<p>I need help.</p>',
  headers: 'Message-ID: <msg-123@example.com>\r\nFrom: customer@example.com',
  attachments: '0',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /webhooks/email/inbound', () => {
  it('creates a new conversation for an unmatched inbound email', async () => {
    const { app, onNewConversation, onNewMessage } = createTestApp();

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendGridPayload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(onNewConversation).toHaveBeenCalledOnce();
    expect(onNewConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        channelOrigin: 'email',
        subject: 'Help with compliance',
        contactEmail: 'customer@example.com',
        body: 'I need help.',
      }),
    );
    expect(onNewMessage).not.toHaveBeenCalled();
  });

  it('adds a message to an existing conversation when threading matches', async () => {
    const match: ChannelConversationRecord = {
      id: 'cc-1',
      channelId: 'ch-1',
      conversationId: 'existing-conv',
      externalId: 'prev-msg@example.com',
      externalMetadata: {},
    };

    const { app, onNewConversation, onNewMessage } = createTestApp({
      threadingMatch: match,
    });

    // Payload with In-Reply-To header so threading can match
    const replyPayload = {
      from: 'Customer <customer@example.com>',
      to: 'support@buildpass.com.au',
      subject: 'Re: Help with compliance',
      text: 'Thanks for the help!',
      html: '<p>Thanks for the help!</p>',
      headers: 'Message-ID: <reply-123@example.com>\r\nIn-Reply-To: <prev-msg@example.com>\r\nFrom: customer@example.com',
      attachments: '0',
    };

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyPayload),
    });

    expect(res.status).toBe(200);
    expect(onNewMessage).toHaveBeenCalledOnce();
    expect(onNewMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'existing-conv',
        contactEmail: 'customer@example.com',
        body: 'Thanks for the help!',
      }),
    );
    expect(onNewConversation).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const { app } = createTestApp();

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for unrecognised webhook format', async () => {
    const { app } = createTestApp();

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ random: 'data' }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects requests with invalid webhook signature', async () => {
    const { app } = createTestApp({ webhookSecret: 'my-secret' });

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': 'wrong-secret',
      },
      body: JSON.stringify(sendGridPayload),
    });

    expect(res.status).toBe(401);
  });

  it('accepts requests with valid webhook signature', async () => {
    const { app } = createTestApp({ webhookSecret: 'my-secret' });

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': 'my-secret',
      },
      body: JSON.stringify(sendGridPayload),
    });

    expect(res.status).toBe(200);
  });

  it('handles Postmark format payloads', async () => {
    const { app, onNewConversation } = createTestApp();

    const postmarkPayload = {
      FromFull: { Email: 'pm-user@example.com', Name: 'PM User' },
      ToFull: [{ Email: 'support@buildpass.com.au' }],
      Subject: 'Postmark inbound',
      TextBody: 'Hello from Postmark',
      HtmlBody: '<p>Hello from Postmark</p>',
      MessageID: 'pm-id-001',
      Headers: [],
      Attachments: [],
    };

    const res = await app.request('/webhooks/email/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postmarkPayload),
    });

    expect(res.status).toBe(200);
    expect(onNewConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        contactEmail: 'pm-user@example.com',
        contactName: 'PM User',
        subject: 'Postmark inbound',
      }),
    );
  });
});
