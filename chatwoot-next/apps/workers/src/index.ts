import { workers } from './workers/index.js';
import { queues } from './queues.js';
import { registerCronJobs } from './cron.js';
import { connection } from './redis.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  logger.info({ workers: workers.length, queues: Object.keys(queues).length }, 'workers booting');
  await registerCronJobs();
  logger.info('workers ready');
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  // BullMQ requires closing workers before queues to drain in-flight jobs.
  await Promise.all(workers.map((w) => w.close()));
  await Promise.all(Object.values(queues).map((q) => q.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

main().catch((err) => {
  logger.error({ err }, 'workers boot failed');
  process.exit(1);
});
