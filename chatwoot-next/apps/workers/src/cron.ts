import { queues } from './queues.js';
import { logger } from './logger.js';

// Mirrors Rails `config/schedule.yml`. Each entry is registered as a BullMQ
// repeatable job; deduplication is handled by `jobId` so re-running this on
// boot is idempotent.
type CronEntry = {
  jobName: string;
  queue: keyof typeof queues;
  pattern: string;
};

const cronEntries: CronEntry[] = [
  {
    jobName: 'Internal::TriggerDailyScheduledItemsJob',
    queue: 'scheduled_jobs',
    pattern: '0 0 * * *',
  },
  {
    jobName: 'TriggerScheduledItemsJob',
    queue: 'scheduled_jobs',
    pattern: '*/5 * * * *',
  },
  {
    jobName: 'Inboxes::FetchImapEmailInboxesJob',
    queue: 'scheduled_jobs',
    pattern: '*/1 * * * *',
  },
  {
    jobName: 'Internal::RemoveStaleContactInboxesJob',
    queue: 'scheduled_jobs',
    pattern: '30 22 * * *',
  },
  {
    jobName: 'Internal::RemoveStaleRedisKeysJob',
    queue: 'scheduled_jobs',
    pattern: '30 22 * * *',
  },
  {
    jobName: 'Notification::RemoveOldNotificationJob',
    queue: 'purgable',
    pattern: '30 22 * * *',
  },
  {
    jobName: 'Internal::DeleteAccountsJob',
    queue: 'scheduled_jobs',
    pattern: '0 1 * * *',
  },
  {
    jobName: 'AutoAssignment::PeriodicAssignmentJob',
    queue: 'scheduled_jobs',
    pattern: '*/30 * * * *',
  },
  {
    jobName: 'Internal::RemoveOrphanConversationsJob',
    queue: 'housekeeping',
    pattern: '0 */12 * * *',
  },
];

export async function registerCronJobs(): Promise<void> {
  for (const entry of cronEntries) {
    await queues[entry.queue].add(
      entry.jobName,
      {},
      {
        jobId: `cron:${entry.jobName}`,
        repeat: { pattern: entry.pattern },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );
    logger.info(
      { jobName: entry.jobName, queue: entry.queue, pattern: entry.pattern },
      'registered cron',
    );
  }
}
