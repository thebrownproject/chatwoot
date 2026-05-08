import type { Worker } from 'bullmq';
import { criticalWorker } from './critical.js';
import { highWorker } from './high.js';
import { mediumWorker } from './medium.js';
import { defaultWorker } from './default.js';
import { mailersWorker } from './mailers.js';
import { lowWorker } from './low.js';
import { scheduledJobsWorker } from './scheduled_jobs.js';
import { deferredWorker } from './deferred.js';
import { purgableWorker } from './purgable.js';
import { housekeepingWorker } from './housekeeping.js';
import { integrationsWorker } from './integrations.js';

export const workers: Worker[] = [
  criticalWorker,
  highWorker,
  mediumWorker,
  defaultWorker,
  mailersWorker,
  lowWorker,
  scheduledJobsWorker,
  deferredWorker,
  purgableWorker,
  housekeepingWorker,
  integrationsWorker,
];

export {
  criticalWorker,
  highWorker,
  mediumWorker,
  defaultWorker,
  mailersWorker,
  lowWorker,
  scheduledJobsWorker,
  deferredWorker,
  purgableWorker,
  housekeepingWorker,
  integrationsWorker,
};
