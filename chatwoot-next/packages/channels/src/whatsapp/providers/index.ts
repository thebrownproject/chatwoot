// Provider selector for WhatsApp.
//
// Rails equivalent: Channel::Whatsapp#provider_service in
// app/models/channel/whatsapp.rb dispatches on the `provider` column.

import type { ChannelConfig } from '../../types.js';
import type { WhatsappProvider } from './base.js';
import { cloudProvider } from './cloud.js';
import { dialog360Provider } from './dialog360.js';

export type { WhatsappProvider } from './base.js';
export { cloudProvider } from './cloud.js';
export { dialog360Provider } from './dialog360.js';

export function pickProvider(channel: ChannelConfig): WhatsappProvider {
  const provider = (channel as { provider?: string }).provider ?? 'default';
  switch (provider) {
    case 'whatsapp_cloud':
      return cloudProvider;
    case 'default':
      return dialog360Provider;
    default:
      throw new Error(`not implemented: whatsapp provider "${provider}"`);
  }
}
