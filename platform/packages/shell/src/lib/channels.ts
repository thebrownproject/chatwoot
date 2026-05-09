import { Mail, Globe, Smartphone, Hash, Bot } from 'lucide-react';
import type { ChannelType } from '../types.js';

export const channelIcons: Record<ChannelType, typeof Mail> = {
  email: Mail,
  web_chat: Globe,
  sms: Smartphone,
  slack: Hash,
  in_app: Bot,
};

export const channelLabels: Record<ChannelType, string> = {
  email: 'Email',
  web_chat: 'Web Chat',
  sms: 'SMS',
  slack: 'Slack',
  in_app: 'In-App',
};
