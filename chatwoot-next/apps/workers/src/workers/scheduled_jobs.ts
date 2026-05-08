import { createWorker } from './_factory.js';
import { defaultProcessor } from './processor.js';

export const scheduledJobsWorker = createWorker('scheduled_jobs', defaultProcessor);
