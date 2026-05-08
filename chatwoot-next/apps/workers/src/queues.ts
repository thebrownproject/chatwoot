import { Queue } from 'bullmq';
import { createWorkerRedis } from './redis.js';

// Queue names mirror Rails `config/sidekiq.yml` priority order. New code
// enqueues via `enqueueJob` from `@chatwoot-next/core`; legacy Rails workers
// still publish to the same names during cutover.
export type QueueName =
  | 'critical'
  | 'high'
  | 'medium'
  | 'default'
  | 'mailers'
  | 'low'
  | 'scheduled_jobs'
  | 'deferred'
  | 'purgable'
  | 'housekeeping'
  | 'integrations';

export const queueNames: QueueName[] = [
  'critical',
  'high',
  'medium',
  'default',
  'mailers',
  'low',
  'scheduled_jobs',
  'deferred',
  'purgable',
  'housekeeping',
  'integrations',
];

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 1000,
};

export const queues: Record<QueueName, Queue> = queueNames.reduce(
  (acc, name) => {
    acc[name] = new Queue(name, {
      connection: createWorkerRedis(),
      defaultJobOptions,
    });
    return acc;
  },
  {} as Record<QueueName, Queue>,
);

export async function closeQueues(): Promise<void> {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
}
