// Voice channel adapter (Enterprise-only).
//
// Rails sources to port:
//   - enterprise/app/controllers/twilio/voice_controller.rb
//   - enterprise/app/services/twilio/voice_webhook_setup_service.rb
//   - enterprise/app/services/twilio/voice_teardown_service.rb
//
// Note: This stub will be wired up by `apps/enterprise`. The OSS registry
// includes it so callers don't need to branch on edition; Enterprise will
// override with the real implementation via DI.

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const voiceChannelAdapter: ChannelAdapter = {
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
