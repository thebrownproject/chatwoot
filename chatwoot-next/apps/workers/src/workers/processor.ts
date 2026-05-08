import type { Job, Processor } from 'bullmq';
import { logger } from '../logger.js';
import { jobHandlers } from '../jobs/index.js';

/**
 * defaultProcessor — dispatches `job.name` to the matching handler in
 * `src/jobs`. Handlers are keyed by Rails ApplicationJob class names, so the
 * legacy producers and the new `enqueueJob` helper share the same wire
 * contract during cutover.
 *
 * Missing handlers throw — BullMQ then retries per the queue's `attempts`
 * policy and surfaces the failure on the `failed` event.
 */
export const defaultProcessor: Processor = async (job: Job) => {
  const handler = jobHandlers[job.name];
  if (!handler) {
    logger.warn({ jobName: job.name, queue: job.queueName }, 'no handler registered');
    throw new Error(
      `No handler registered for job '${job.name}' in queue '${job.queueName}'`,
    );
  }
  return handler(job.data, job);
};
