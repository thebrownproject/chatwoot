import { Queue } from 'bullmq';
import { connection } from './redis.js';

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

export const queues: Record<QueueName, Queue> = queueNames.reduce(
  (acc, name) => {
    acc[name] = new Queue(name, { connection });
    return acc;
  },
  {} as Record<QueueName, Queue>,
);
