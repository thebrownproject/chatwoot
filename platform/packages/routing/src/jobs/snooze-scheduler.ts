import type { RoutingDb } from '../types.js';

/**
 * Snooze scheduler job definition for BullMQ.
 *
 * This module defines the job type and handler logic. Actual BullMQ
 * queue/worker setup belongs in apps/workers — this just exports the
 * handler and job name for registration there.
 */

export const SNOOZE_JOB_NAME = 'check-snoozed-conversations';

/** Cron expression: every minute */
export const SNOOZE_CRON = '* * * * *';

export interface SnoozeJobData {
  /** Timestamp when the job was enqueued (for observability). */
  enqueuedAt: string;
}

/**
 * Check for conversations where status=snoozed AND snoozed_until <= now(),
 * and reopen each one by setting status to 'open'.
 *
 * Returns the number of conversations reopened.
 */
export async function checkSnoozedConversations(db: RoutingDb): Promise<number> {
  const due = await db.getSnoozedConversationsDue();

  for (const conversation of due) {
    await db.updateConversationStatus(conversation.id, 'open');
  }

  return due.length;
}

/**
 * BullMQ worker processor function.
 * Wire this into a BullMQ Worker in apps/workers:
 *
 * ```ts
 * import { Worker } from 'bullmq';
 * import { SNOOZE_JOB_NAME, processSnoozeJob } from '@buildpass/routing/jobs/snooze-scheduler';
 *
 * const worker = new Worker('snooze', async (job) => {
 *   return processSnoozeJob(db);
 * }, { connection: redis });
 *
 * // Add repeatable job:
 * import { Queue } from 'bullmq';
 * const queue = new Queue('snooze', { connection: redis });
 * await queue.add(SNOOZE_JOB_NAME, { enqueuedAt: new Date().toISOString() }, {
 *   repeat: { pattern: SNOOZE_CRON },
 * });
 * ```
 */
export async function processSnoozeJob(db: RoutingDb): Promise<{ reopened: number }> {
  const reopened = await checkSnoozedConversations(db);
  return { reopened };
}
