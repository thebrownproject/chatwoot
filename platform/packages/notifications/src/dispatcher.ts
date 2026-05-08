import type {
  ConversationEvent,
  ConversationParticipant,
  CreateNotificationData,
  NotificationType,
  NotificationTypeSettings,
} from './types.js';
import { createNotification, type NotificationDb } from './data/notifications.js';
import { getSettings, type NotificationSettingsDb } from './data/notification-settings.js';

type Db = NotificationDb & NotificationSettingsDb;

export interface DispatchContext {
  /** Get participants for a conversation (provided by the conversations module) */
  getParticipants: (conversationId: string) => Promise<ConversationParticipant[]>;
  /** Get the assignee user ID for a conversation */
  getAssigneeId: (conversationId: string) => Promise<string | null>;
  /** Get team lead user IDs */
  getTeamLeadIds: () => Promise<string[]>;
}

/**
 * Map ConversationEvent.eventType to NotificationType.
 * Returns null if the event type doesn't trigger notifications.
 */
function eventToNotificationType(eventType: string): NotificationType | null {
  switch (eventType) {
    case 'new_message':
      return 'new_message';
    case 'assigned':
      return 'assignment';
    case 'mention':
      return 'mention';
    case 'status_changed':
    case 'reopened':
    case 'snoozed':
      return 'status_change';
    case 'escalated':
      return 'escalation';
    default:
      return null;
  }
}

function buildNotificationContent(event: ConversationEvent, type: NotificationType): { title: string; body: string } {
  switch (type) {
    case 'new_message':
      return {
        title: 'New message',
        body: `New message in conversation`,
      };
    case 'assignment':
      return {
        title: 'Conversation assigned',
        body: `You have been assigned a conversation`,
      };
    case 'mention':
      return {
        title: 'You were mentioned',
        body: `You were mentioned in a conversation`,
      };
    case 'status_change': {
      const to = (event.payload as { to?: string }).to ?? 'unknown';
      return {
        title: 'Status changed',
        body: `Conversation status changed to ${to}`,
      };
    }
    case 'escalation':
      return {
        title: 'Escalation',
        body: `A conversation has been escalated`,
      };
  }
}

async function isTypeEnabled(
  db: Db,
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const settings = await getSettings(db, userId);
  const typeSettings: NotificationTypeSettings = settings.settings;
  return typeSettings[type] !== false;
}

/**
 * Determine who should be notified for a given event, respecting user settings.
 */
async function resolveRecipients(
  db: Db,
  event: ConversationEvent,
  type: NotificationType,
  context: DispatchContext,
): Promise<string[]> {
  const recipients = new Set<string>();

  switch (type) {
    case 'new_message': {
      // Notify assignee + participants (except sender)
      const assigneeId = await context.getAssigneeId(event.conversationId);
      if (assigneeId) recipients.add(assigneeId);

      const participants = await context.getParticipants(event.conversationId);
      for (const p of participants) {
        recipients.add(p.userId);
      }
      // Remove sender
      recipients.delete(event.actorId);
      break;
    }
    case 'assignment': {
      // Notify the new assignee
      const newAssignee = (event.payload as { assigneeId?: string }).assigneeId;
      if (newAssignee) recipients.add(newAssignee);
      break;
    }
    case 'mention': {
      // Notify the mentioned user
      const mentionedUserId = (event.payload as { mentionedUserId?: string }).mentionedUserId;
      if (mentionedUserId) recipients.add(mentionedUserId);
      break;
    }
    case 'status_change': {
      // Notify assignee
      const assignee = await context.getAssigneeId(event.conversationId);
      if (assignee) recipients.add(assignee);
      recipients.delete(event.actorId);
      break;
    }
    case 'escalation': {
      // Notify team leads
      const leadIds = await context.getTeamLeadIds();
      for (const id of leadIds) {
        recipients.add(id);
      }
      break;
    }
  }

  // Filter by user notification settings
  const enabled: string[] = [];
  for (const userId of recipients) {
    if (await isTypeEnabled(db, userId, type)) {
      enabled.push(userId);
    }
  }
  return enabled;
}

/**
 * Receive a ConversationEvent, determine who should be notified and how,
 * check user notification settings, and create notification records.
 *
 * Future: this is the integration point for email/push delivery.
 * For now it only creates in-app notification records.
 */
export async function dispatch(
  db: Db,
  event: ConversationEvent,
  context: DispatchContext,
): Promise<void> {
  const type = eventToNotificationType(event.eventType);
  if (!type) return;

  const recipientIds = await resolveRecipients(db, event, type, context);
  const content = buildNotificationContent(event, type);

  const notifications: CreateNotificationData[] = recipientIds.map((userId) => ({
    userId,
    type,
    title: content.title,
    body: content.body,
    conversationId: event.conversationId,
  }));

  const results = await Promise.allSettled(
    notifications.map((data) => createNotification(db, data)),
  );
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length}/${results.length} notifications failed to create`);
  }
}
