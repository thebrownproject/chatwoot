import type { Integration } from '../registry.js';

/**
 * OpenAI integration — chat completion + embeddings.
 *
 * Rails source: lib/integrations/openai/
 *
 * TODO: wire actual `openai` SDK calls. Dep is listed in package.json but not
 * imported here yet.
 */
export const openaiIntegration: Integration & {
  chatCompletion(input: unknown): Promise<unknown>;
  embed(input: unknown): Promise<unknown>;
} = {
  setup(_account, _params) {
    throw new Error('not implemented');
  },
  chatCompletion(_input) {
    throw new Error('not implemented');
  },
  embed(_input) {
    throw new Error('not implemented');
  },
  processEvent(_event) {
    throw new Error('not implemented');
  },
  processOutbound(_message) {
    throw new Error('not implemented');
  },
};
