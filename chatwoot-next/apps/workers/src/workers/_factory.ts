import { Worker, type Processor } from 'bullmq';
import { connection } from '../redis.js';
import { logger } from '../logger.js';
import { jobHandlers } from '../jobs/index.js';
import type { QueueName } from '../queues.js';

// Default processor: dispatches `job.name` to the matching handler in
// `src/jobs`. Each per-queue worker module wraps this so we can tune
// concurrency or override the processor later if needed.
export const defaultProcessor: Processor = async (job) => {
  const handler = jobHandlers[job.name];
  if (!handler) {
    logger.warn({ jobName: job.name, queue: job.queueName }, 'no handler registered');
    throw new Error(`no handler for job ${job.name}`);
  }
  return handler(job.data);
};

export function createWorker(queue: QueueName, processor: Processor = defaultProcessor): Worker {
  const worker = new Worker(queue, processor, { connection });
  worker.on('failed', (job, err) => {
    logger.error({ queue, jobName: job?.name, err: err.message }, 'job failed');
  });
  return worker;
}
