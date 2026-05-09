export { AppLayout } from './components/AppLayout.js';
export { Sidebar } from './components/Sidebar.js';
export { Header } from './components/Header.js';
export { registerModule, getModule, getAllModules, getNavItems } from './registry.js';
export { channelIcons, channelLabels } from './lib/channels.js';
export { initials, capitalize, timeAgo, formatTime, formatDate } from './lib/format.js';
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
} from './types.js';
