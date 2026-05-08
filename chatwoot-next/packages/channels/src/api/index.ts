// API channel adapter — custom webhook ingestion.
//
// Rails sources to port:
//   - app/models/channel/api.rb
//   - app/services/api/  (currently no per-channel service tree; ingestion
//     happens in app/controllers/api/v1/widget/messages_controller.rb and
//     the generic incoming_message flow)
//   - lib/integrations/api/* (if/when added)

import type {
  ChannelAdapter,
  ChannelConfig,
  InboundEvent,
  OutboundMessage,
  WebhookRequest,
} from '../types.js';

export const apiChannelAdapter: ChannelAdapter = {
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
