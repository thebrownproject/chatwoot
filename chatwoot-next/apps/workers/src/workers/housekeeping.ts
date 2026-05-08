import { createWorker } from './_factory.js';
import { defaultProcessor } from './processor.js';

export const housekeepingWorker = createWorker('housekeeping', defaultProcessor);
