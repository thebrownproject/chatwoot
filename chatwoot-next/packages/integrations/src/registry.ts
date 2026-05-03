import { slackIntegration } from './slack/index.js';
import { linearIntegration } from './linear/index.js';
import { dialogflowIntegration } from './dialogflow/index.js';
import { openaiIntegration } from './openai/index.js';
import { captainIntegration } from './captain/index.js';
import { dyteIntegration } from './dyte/index.js';
import { googleTranslateIntegration } from './google-translate/index.js';
import { leadsquaredIntegration } from './leadsquared/index.js';
import { clearbitIntegration } from './clearbit/index.js';
import { notionIntegration } from './notion/index.js';
import { shopifyIntegration } from './shopify/index.js';

export interface Integration {
  setup(account: unknown, params: unknown): Promise<unknown>;
  processEvent(event: unknown): Promise<unknown>;
  processOutbound(message: unknown): Promise<unknown>;
}

export type IntegrationName =
  | 'slack'
  | 'linear'
  | 'dialogflow'
  | 'openai'
  | 'captain'
  | 'dyte'
  | 'google-translate'
  | 'leadsquared'
  | 'clearbit'
  | 'notion'
  | 'shopify';

export const integrationRegistry: Record<IntegrationName, Integration> = {
  slack: slackIntegration,
  linear: linearIntegration,
  dialogflow: dialogflowIntegration,
  openai: openaiIntegration,
  captain: captainIntegration,
  dyte: dyteIntegration,
  'google-translate': googleTranslateIntegration,
  leadsquared: leadsquaredIntegration,
  clearbit: clearbitIntegration,
  notion: notionIntegration,
  shopify: shopifyIntegration,
};
