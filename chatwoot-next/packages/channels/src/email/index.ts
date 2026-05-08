// Email channel adapter.
//
// Rails sources to port:
//   - app/models/channel/email.rb
//   - app/services/email/send_on_email_service.rb
//   - app/services/imap/base_fetch_email_service.rb
//   - app/services/imap/fetch_email_service.rb
//   - app/services/imap/google_fetch_email_service.rb
//   - app/services/imap/microsoft_fetch_email_service.rb
//   - app/mailboxes/application_mailbox.rb
//   - app/mailboxes/default_mailbox.rb
//   - app/mailboxes/reply_mailbox.rb
//   - app/mailboxes/imap/*
//
// Note: IMAP polling lives in apps/workers (cron-style). This package only
// provides the parse (RFC 822 -> InboundEvent) and send (SMTP) primitives.

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const emailChannelAdapter: ChannelAdapter = {
  verifyWebhookSignature(_req: WebhookRequest): boolean {
    throw new Error('not implemented');
  },
  async parseInbound(_req: WebhookRequest): Promise<InboundEvent> {
    throw new Error('not implemented');
  },
  async sendOutbound(
    _message: OutboundMessage,
    _channel: ChannelConfig,
  ): Promise<{ externalId: string }> {
    throw new Error('not implemented');
  },
  async setupChannel(
    _params: Record<string, unknown>,
  ): Promise<{ channelId: bigint }> {
    throw new Error('not implemented');
  },
};
