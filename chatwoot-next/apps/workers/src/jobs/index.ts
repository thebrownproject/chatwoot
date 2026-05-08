import type { Job } from 'bullmq';
import { fetchImapInboxes } from './imap-fetch.js';
import { runPeriodicAutoAssignment } from './auto-assignment.js';
import { sendReply } from './send-reply.js';
import { dispatchWebhook } from './webhook.js';
import { dispatchEvent } from './event-dispatcher.js';

export type JobHandler = (payload: unknown, job: Job) => Promise<unknown>;

const notImplemented: JobHandler = async () => {
  throw new Error('not implemented');
};

// Map keyed by Rails ApplicationJob class names so the dispatcher can resolve
// the same `job.name` that the legacy producers (and the new
// `enqueueJob` helper) already use.
export const jobHandlers: Record<string, JobHandler> = {
  // Periodic / scheduled
  'Inboxes::FetchImapEmailInboxesJob': async () => fetchImapInboxes(),
  'AutoAssignment::PeriodicAssignmentJob': async () => runPeriodicAutoAssignment(),
  'TriggerScheduledItemsJob': notImplemented,
  'Internal::TriggerDailyScheduledItemsJob': notImplemented,
  'Internal::RemoveStaleContactInboxesJob': notImplemented,
  'Internal::RemoveStaleRedisKeysJob': notImplemented,
  'Internal::DeleteAccountsJob': notImplemented,
  'Internal::RemoveOrphanConversationsJob': notImplemented,
  'Notification::RemoveOldNotificationJob': notImplemented,

  // Hot path
  'SendReplyJob': async (payload) => sendReply((payload as { messageId: number }).messageId),
  'WebhookJob': async (payload) => {
    const { webhookId, body } = payload as { webhookId: number; body: unknown };
    return dispatchWebhook(webhookId, body);
  },
  'EventDispatcherJob': async (payload) => {
    const { eventName, body } = payload as { eventName: string; body: unknown };
    return dispatchEvent(eventName, body);
  },
};

export {
  fetchImapInboxes,
  runPeriodicAutoAssignment,
  sendReply,
  dispatchWebhook,
  dispatchEvent,
};
