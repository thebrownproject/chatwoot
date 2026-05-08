import type { ReactNode } from 'react';

export type InboxView = 'mine' | 'unassigned' | 'all';

export type ConversationStatus = 'open' | 'pending' | 'snoozed' | 'resolved';

export type ConversationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ChannelType = 'email' | 'web_chat' | 'sms' | 'slack' | 'in_app';

export type UserType = 'human_agent' | 'ai_agent' | 'contact' | 'system';

export type MessageVisibility = 'public' | 'internal';

export type MessageType = 'text' | 'rich' | 'activity';

export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  navItems: NavItem[];
  routes: RouteDefinition[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface RouteDefinition {
  path: string;
  component: () => ReactNode;
}

export interface User {
  id: string;
  type: UserType;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface Label {
  id: string;
  name: string;
  color: string | null;
}

export interface Team {
  id: string;
  name: string;
}

export interface Conversation {
  id: string;
  displayId: number;
  status: ConversationStatus;
  channelOrigin: ChannelType;
  assignee: User | null;
  subject: string | null;
  priority: ConversationPriority;
  snoozedUntil: string | null;
  firstReplyAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  labels?: Label[];
  contact?: User;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  type: MessageType;
  visibility: MessageVisibility;
  body: string;
  bodyHtml: string | null;
  metadata: Record<string, unknown>;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface ConversationEvent {
  id: string;
  conversationId: string;
  actor: User;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
