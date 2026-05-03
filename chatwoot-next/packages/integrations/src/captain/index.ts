import type { Integration } from '../registry.js';

/**
 * Captain — Enterprise AI Copilot.
 *
 * Rails source:
 *   - enterprise/lib/captain/
 *   - enterprise/app/models/captain_assistant
 *   - enterprise/app/models/captain_inbox
 *   - enterprise/app/models/captain_custom_tool
 *   - enterprise/app/models/captain_document
 *   - enterprise/app/models/captain_scenario
 *   - enterprise/app/models/copilot_thread
 *   - enterprise/app/models/copilot_message
 *
 * RAG: pgvector 1536-dim embeddings on `captain_documents`.
 * Reuse the existing ivfflat indexes — do NOT rebuild them on cutover.
 *
 * Risk: HIGHEST (alongside Slack). Enterprise-only.
 */
export const captainIntegration: Integration & {
  runRag(query: unknown, account: unknown): Promise<unknown>;
  runScenario(scenario: unknown): Promise<unknown>;
  useCustomTool(tool: unknown, args: unknown): Promise<unknown>;
} = {
  setup(_account, _params) {
    throw new Error('not implemented');
  },
  runRag(_query, _account) {
    throw new Error('not implemented');
  },
  runScenario(_scenario) {
    throw new Error('not implemented');
  },
  useCustomTool(_tool, _args) {
    throw new Error('not implemented');
  },
  processEvent(_event) {
    throw new Error('not implemented');
  },
  processOutbound(_message) {
    throw new Error('not implemented');
  },
};
