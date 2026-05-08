import type { OutboundEmail, SendResult, EmailConfig } from '../types/email.js';

/** Interface for email delivery — injectable for testing */
export interface EmailClient {
  send(email: OutboundEmail): Promise<SendResult>;
}

/** SendGrid email client implementation */
export class SendGridClient implements EmailClient {
  private apiKey: string;
  private baseUrl = 'https://api.sendgrid.com/v3/mail/send';

  constructor(config: Pick<EmailConfig, 'apiKey'>) {
    this.apiKey = config.apiKey;
  }

  async send(email: OutboundEmail): Promise<SendResult> {
    const payload = {
      personalizations: [{ to: [{ email: email.to }] }],
      from: { email: email.from, name: email.fromName },
      reply_to: email.replyTo ? { email: email.replyTo } : undefined,
      subject: email.subject,
      content: [
        { type: 'text/plain', value: email.bodyText },
        { type: 'text/html', value: email.bodyHtml },
      ],
      headers: {
        'Message-ID': `<${email.messageId}>`,
        ...(email.inReplyTo ? { 'In-Reply-To': `<${email.inReplyTo}>` } : {}),
        ...(email.references?.length
          ? { References: email.references.map((r) => `<${r}>`).join(' ') }
          : {}),
      },
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 202) {
        return { success: true, messageId: email.messageId };
      }

      const errorBody = await response.text();

      if (response.status === 429) {
        return { success: false, error: `Rate limited: ${errorBody}` };
      }

      return { success: false, error: `SendGrid error ${response.status}: ${errorBody}` };
    } catch (err) {
      return { success: false, error: `Network error: ${(err as Error).message}` };
    }
  }
}
