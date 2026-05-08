import { describe, it, expect } from 'vitest';
import { EmailAdapter, EmailParseError } from '../adapters/email.js';
import type { EmailClient } from '../services/email-client.js';
import type { ThreadingDb } from '../adapters/email-threading.js';
import type { ChannelRecord, MessageForDelivery, SendResult, ChannelConversationRecord } from '../types/email.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockEmailClient(result: SendResult = { success: true, messageId: 'test-id' }): EmailClient {
  return { send: async () => result };
}

function createMockThreadingDb(overrides: Partial<ThreadingDb> = {}): ThreadingDb {
  return {
    findChannelConversationByExternalId: async () => null,
    findChannelConversationsByMetadata: async () => [],
    findChannelConversationBySubjectAndSender: async () => null,
    getChannelConversationsByConversation: async () => [],
    ...overrides,
  };
}

function createAdapter(
  clientResult?: SendResult,
  dbOverrides?: Partial<ThreadingDb>,
): EmailAdapter {
  return new EmailAdapter(
    createMockEmailClient(clientResult),
    createMockThreadingDb(dbOverrides),
  );
}

// ---------------------------------------------------------------------------
// Sample payloads
// ---------------------------------------------------------------------------

const sendGridPayload = {
  from: 'Alice Smith <alice@example.com>',
  to: 'support@buildpass.com.au',
  subject: 'Need help with my project',
  text: 'Hi, I need assistance with my compliance report.',
  html: '<p>Hi, I need assistance with my compliance report.</p>',
  headers: [
    'Message-ID: <abc123@mail.example.com>',
    'In-Reply-To: <prev456@buildpass.com.au>',
    'References: <first789@buildpass.com.au> <prev456@buildpass.com.au>',
  ].join('\r\n'),
  attachments: '0',
};

const postmarkPayload = {
  FromFull: { Email: 'bob@example.com', Name: 'Bob Jones' },
  ToFull: [{ Email: 'support@buildpass.com.au' }],
  Subject: 'Re: Compliance question',
  TextBody: 'Thanks for the quick reply!',
  HtmlBody: '<p>Thanks for the quick reply!</p>',
  MessageID: 'pm-msg-001',
  Headers: [
    { Name: 'In-Reply-To', Value: '<outbound-123@buildpass.com.au>' },
    { Name: 'References', Value: '<outbound-123@buildpass.com.au>' },
  ],
  Attachments: [
    { Name: 'report.pdf', ContentType: 'application/pdf', ContentLength: 45000 },
  ],
};

// ---------------------------------------------------------------------------
// Tests: receive()
// ---------------------------------------------------------------------------

describe('EmailAdapter.receive', () => {
  const adapter = createAdapter();

  it('parses a SendGrid inbound webhook payload', () => {
    const email = adapter.receive(sendGridPayload);

    expect(email.from).toBe('alice@example.com');
    expect(email.fromName).toBe('Alice Smith');
    expect(email.subject).toBe('Need help with my project');
    expect(email.bodyText).toBe('Hi, I need assistance with my compliance report.');
    expect(email.bodyHtml).toBe('<p>Hi, I need assistance with my compliance report.</p>');
    expect(email.messageId).toBe('abc123@mail.example.com');
    expect(email.inReplyTo).toBe('prev456@buildpass.com.au');
    expect(email.references).toContain('first789@buildpass.com.au');
    expect(email.references).toContain('prev456@buildpass.com.au');
  });

  it('parses a Postmark inbound webhook payload', () => {
    const email = adapter.receive(postmarkPayload);

    expect(email.from).toBe('bob@example.com');
    expect(email.fromName).toBe('Bob Jones');
    expect(email.to).toContain('support@buildpass.com.au');
    expect(email.subject).toBe('Re: Compliance question');
    expect(email.bodyText).toBe('Thanks for the quick reply!');
    expect(email.messageId).toBe('pm-msg-001');
    expect(email.inReplyTo).toBe('<outbound-123@buildpass.com.au>');
    expect(email.attachments).toHaveLength(1);
    expect(email.attachments[0].filename).toBe('report.pdf');
    expect(email.attachments[0].size).toBe(45000);
  });

  it('throws EmailParseError for null payload', () => {
    expect(() => adapter.receive(null)).toThrow(EmailParseError);
  });

  it('throws EmailParseError for unrecognised format', () => {
    expect(() => adapter.receive({ random: 'data' })).toThrow(EmailParseError);
  });

  it('handles SendGrid payload with missing optional fields', () => {
    const minimal = {
      from: 'test@example.com',
      headers: 'From: test@example.com',
    };
    const email = adapter.receive(minimal);
    expect(email.from).toBe('test@example.com');
    expect(email.subject).toBe('(no subject)');
    expect(email.bodyText).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Tests: deliver()
// ---------------------------------------------------------------------------

describe('EmailAdapter.deliver', () => {
  it('sends an email via the email client and returns success', async () => {
    const sentEmails: Array<{ to: string; subject: string }> = [];
    const client: EmailClient = {
      send: async (email) => {
        sentEmails.push({ to: email.to, subject: email.subject });
        return { success: true, messageId: email.messageId };
      },
    };

    const adapter = new EmailAdapter(client, createMockThreadingDb());

    const message: MessageForDelivery = {
      id: 'msg-1',
      conversationId: 'conv-abc',
      senderId: 'agent-1',
      senderName: 'Support Agent',
      senderEmail: 'customer@example.com',
      body: 'We can help with that.',
      createdAt: new Date('2026-05-08T10:00:00Z'),
    };

    const channel: ChannelRecord = {
      id: 'ch-1',
      type: 'email',
      name: 'Support Email',
      config: {
        provider: 'sendgrid',
        apiKey: 'test-key',
        fromAddress: 'support@buildpass.com.au',
        fromName: 'Buildpass Support',
        domain: 'buildpass.com.au',
      },
      active: true,
    };

    const result = await adapter.deliver(message, channel);
    expect(result.success).toBe(true);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('customer@example.com');
  });

  it('includes threading headers from conversation history', async () => {
    let capturedInReplyTo = '';
    let capturedReferences: string[] = [];

    const client: EmailClient = {
      send: async (email) => {
        capturedInReplyTo = email.inReplyTo ?? '';
        capturedReferences = email.references ?? [];
        return { success: true, messageId: email.messageId };
      },
    };

    const mockRecord: ChannelConversationRecord = {
      id: 'cc-1',
      channelId: 'ch-1',
      conversationId: 'conv-abc',
      externalId: 'prev-msg-id@example.com',
      externalMetadata: { messageIds: ['first-msg@example.com'] },
    };

    const adapter = new EmailAdapter(client, createMockThreadingDb({
      getChannelConversationsByConversation: async () => [mockRecord],
    }));

    const message: MessageForDelivery = {
      id: 'msg-2',
      conversationId: 'conv-abc',
      senderId: 'agent-1',
      senderName: 'Agent',
      senderEmail: 'customer@example.com',
      body: 'Follow-up message',
      createdAt: new Date(),
    };

    const channel: ChannelRecord = {
      id: 'ch-1',
      type: 'email',
      name: 'Support Email',
      config: {
        provider: 'sendgrid',
        apiKey: 'key',
        fromAddress: 'support@buildpass.com.au',
        fromName: 'Support',
        domain: 'buildpass.com.au',
      },
      active: true,
    };

    await adapter.deliver(message, channel);

    // In-Reply-To should be the last known message ID
    expect(capturedInReplyTo).toBe('first-msg@example.com');
    expect(capturedReferences).toContain('prev-msg-id@example.com');
    expect(capturedReferences).toContain('first-msg@example.com');
  });
});

// ---------------------------------------------------------------------------
// Tests: formatMessage()
// ---------------------------------------------------------------------------

describe('EmailAdapter.formatMessage', () => {
  const adapter = createAdapter();

  it('generates HTML with the message body and sender info', () => {
    const message: MessageForDelivery = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      senderName: 'Jane from Support',
      body: 'Hello, we received your request.',
      createdAt: new Date('2026-05-08T14:30:00Z'),
    };

    const html = adapter.formatMessage(message);
    expect(html).toContain('Hello, we received your request.');
    expect(html).toContain('Jane from Support');
    expect(html).toContain('2026-05-08');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('uses bodyHtml when available', () => {
    const message: MessageForDelivery = {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      senderName: 'Agent',
      body: 'plain text',
      bodyHtml: '<strong>rich text</strong>',
      createdAt: new Date(),
    };

    const html = adapter.formatMessage(message);
    expect(html).toContain('<strong>rich text</strong>');
    expect(html).not.toContain('plain text');
  });

  it('escapes HTML entities in plain text body', () => {
    const message: MessageForDelivery = {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'agent-1',
      senderName: 'Agent',
      body: 'Use <script> & "quotes"',
      createdAt: new Date(),
    };

    const html = adapter.formatMessage(message);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;quotes&quot;');
  });
});
