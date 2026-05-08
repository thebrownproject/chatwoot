export { AppLayout } from './components/AppLayout';
export { Sidebar } from './components/Sidebar';
export { Header } from './components/Header';
export { registerModule, getModule, getAllModules, getNavItems } from './registry';
export { channelIcons, channelLabels } from './lib/channels';
export { initials, capitalize, timeAgo, formatTime, formatDate } from './lib/format';
export type {
  ModuleManifest,
  NavItem,
  RouteDefinition,
  InboxView,
  ConversationStatus,
  ConversationPriority,
  ChannelType,
  UserType,
  MessageVisibility,
  MessageType,
  User,
  Label,
  Team,
  Conversation,
  Message,
  Attachment,
  ConversationEvent,
} from './types';
