import { createWorker } from './_factory.js';
import { defaultProcessor } from './processor.js';

export const purgableWorker = createWorker('purgable', defaultProcessor);
