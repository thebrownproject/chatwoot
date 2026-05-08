import { Worker, type Job, type Processor } from 'bullmq';
import { createBlockingRedis } from '../redis.js';
import { logger } from '../logger.js';
import type { QueueName } from '../queues.js';
import { defaultProcessor } from './processor.js';

function concurrencyFor(queue: QueueName): number {
  const envKey = `WORKER_CONCURRENCY_${queue.toUpperCase()}`;
  const raw = process.env[envKey] ?? process.env.WORKER_CONCURRENCY ?? '5';
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function createWorker(
  name: QueueName,
  processor: Processor = defaultProcessor,
): Worker {
  const worker = new Worker(name, processor, {
    connection: createBlockingRedis(),
    concurrency: concurrencyFor(name),
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(
      { jobId: job?.id, name: job?.name, queue: name, err: err.message },
      'job failed',
    );
  });

  worker.on('completed', (job: Job) => {
    logger.debug({ jobId: job.id, name: job.name, queue: name }, 'job completed');
  });

  return worker;
}

export { defaultProcessor };
