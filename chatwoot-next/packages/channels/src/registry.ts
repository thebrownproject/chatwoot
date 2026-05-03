// Channel registry — maps Rails STI `Channel::*` types to their TS adapter.
// Mirrors app/models/channel/*.rb subclasses. Every adapter implements the
// ChannelAdapter contract (verify / parse / send / setup).

import type { ChannelAdapter, ChannelType } from './types.js';

import { apiChannelAdapter } from './api/index.js';
import { emailChannelAdapter } from './email/index.js';
import { facebookChannelAdapter } from './facebook/index.js';
import { instagramChannelAdapter } from './instagram/index.js';
import { lineChannelAdapter } from './line/index.js';
import { smsChannelAdapter } from './sms/index.js';
import { telegramChannelAdapter } from './telegram/index.js';
import { tiktokChannelAdapter } from './tiktok/index.js';
import { twilioSmsChannelAdapter } from './twilio-sms/index.js';
import { twitterChannelAdapter } from './twitter/index.js';
import { webWidgetChannelAdapter } from './web-widget/index.js';
import { whatsappAdapter } from './whatsapp/index.js';
import { voiceChannelAdapter } from './voice/index.js';

export const channelRegistry: Record<ChannelType, ChannelAdapter> = {
  'Channel::Api': apiChannelAdapter,
  'Channel::Email': emailChannelAdapter,
  'Channel::FacebookPage': facebookChannelAdapter,
  'Channel::Instagram': instagramChannelAdapter,
  'Channel::Line': lineChannelAdapter,
  'Channel::Sms': smsChannelAdapter,
  'Channel::Telegram': telegramChannelAdapter,
  'Channel::TikTok': tiktokChannelAdapter,
  'Channel::TwilioSms': twilioSmsChannelAdapter,
  'Channel::TwitterProfile': twitterChannelAdapter,
  'Channel::WebWidget': webWidgetChannelAdapter,
  'Channel::Whatsapp': whatsappAdapter,
  'Channel::Voice': voiceChannelAdapter,
};
