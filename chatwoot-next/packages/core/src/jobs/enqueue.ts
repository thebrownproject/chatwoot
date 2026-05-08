/**
 * QueueName — mirrors the Sidekiq queues declared in `config/sidekiq.yml`
 * so that BullMQ in `apps/workers` can be a drop-in replacement during
 * cutover. Keep this list in sync if Sidekiq queues change.
 */
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

export type EnqueueOptions = {
  delay?: number;
  cron?: string;
};

/**
 * enqueueJob — central dispatcher.
 *
 * During cutover, this stub dispatches to BullMQ (consumed by `apps/workers`)
 * via Redis. Each `QueueName` should map to a single shared BullMQ Queue
 * instance, lazily constructed on first use.
 *
 * TODO: wire BullMQ Queue instance per queue name (one Queue per
 * `QueueName`, connection reused). Until then, calling this throws.
 */
export async function enqueueJob(
  _queue: QueueName,
  _name: string,
  _payload: unknown,
  _opts?: EnqueueOptions,
): Promise<void> {
  throw new Error('not implemented');
}
