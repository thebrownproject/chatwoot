import { createWorker } from './_factory.js';
import { defaultProcessor } from './processor.js';

export const integrationsWorker = createWorker('integrations', defaultProcessor);
