/**
 * Captain AI Copilot — enterprise-only orchestration glue.
 *
 * Rails source:
 *   `enterprise/app/models/captain/` (assistant, document, scenario,
 *     custom_tool, inbox, copilot_thread, copilot_message)
 *   `enterprise/lib/captain/`
 *
 * Glue layer that calls into `@chatwoot-next/integrations/captain`
 * (RAG indexing, scenario execution, custom tool dispatch).
 */

export interface CaptainAssistant {
  id: number;
  accountId: number;
}

export function indexDocument(_assistantId: number, _documentId: number): void {
  // TODO: call @chatwoot-next/integrations/captain RAG ingestion.
}

export function runScenario(_assistantId: number, _scenarioId: number): void {
  // TODO: call @chatwoot-next/integrations/captain scenario runner.
}

export function executeCustomTool(_toolId: number, _payload: unknown): void {
  // TODO: call @chatwoot-next/integrations/captain custom-tool executor.
}
