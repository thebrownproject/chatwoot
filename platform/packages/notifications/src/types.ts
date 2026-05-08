/** Notification types aligned with ConversationEvent types */
export type NotificationType =
  | 'new_message'
  | 'assignment'
  | 'mention'
  | 'status_change'
  | 'escalation';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  conversationId: string | null;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  conversationId?: string | undefined;
}

export interface NotificationFilters {
  read?: boolean | undefined;
  type?: NotificationType | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  settings: NotificationTypeSettings;
}

export interface NotificationTypeSettings {
  new_message?: boolean | undefined;
  assignment?: boolean | undefined;
  mention?: boolean | undefined;
  status_change?: boolean | undefined;
  escalation?: boolean | undefined;
}

export interface UpdateSettingsData {
  emailEnabled?: boolean | undefined;
  pushEnabled?: boolean | undefined;
  settings?: NotificationTypeSettings | undefined;
}

/**
 * ConversationEvent is produced by the conversations module.
 * The dispatcher consumes these to create notifications.
 */
export interface ConversationEvent {
  id: string;
  conversationId: string;
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Participant info needed by the dispatcher to determine notification recipients.
 */
export interface ConversationParticipant {
  userId: string;
  role: 'contact' | 'assignee' | 'observer' | 'copilot';
}

export interface NotificationManifest {
  name: string;
  routes: string[];
  permissions: string[];
}
