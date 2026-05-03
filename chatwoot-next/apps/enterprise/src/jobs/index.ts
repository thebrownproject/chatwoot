/**
 * Enterprise-specific BullMQ job handlers.
 *
 * Registered with `apps/workers` via the same job registry that overlays
 * use, but with distinct keys (no OSS counterpart). Subdirectory map
 * mirrors `enterprise/app/jobs/`:
 *   - sla/         — SLA processing & breach checks
 *   - saml/        — SAML assertion handling
 *   - message/     — enterprise message lifecycle jobs
 *   - migration/   — long-running data migrations
 *   - portal/      — knowledge-base / help-center jobs
 *   - audit/       — audit log flush
 *   - captain/     — RAG indexing
 */

import type { OverlayRegistry } from '../boot';

type JobHandler = (payload: unknown) => Promise<void> | void;

const enterpriseJobHandlers: Record<string, JobHandler> = {
  // SLA
  'sla:process': async () => {
    // TODO: port `enterprise/app/jobs/sla/process_job.rb`.
  },
  'sla:check_breach': async () => {
    // TODO: port `enterprise/app/jobs/sla/check_breach_job.rb`.
  },

  // Audit
  'audit:flush': async () => {
    // TODO: flush in-memory audit buffer to the `audits` table.
  },

  // Captain
  'captain:rag_index': async () => {
    // TODO: ingest documents into the Captain vector store.
  },

  // SAML
  'saml:assertion': async () => {
    // TODO: process queued SAML assertion.
  },

  // Message
  'message:enterprise_dispatch': async () => {
    // TODO: enterprise message lifecycle hooks.
  },

  // Migration
  'migration:long_running': async () => {
    // TODO: bulk data migration job.
  },

  // Portal
  'portal:reindex': async () => {
    // TODO: reindex knowledge base articles.
  },
};

export function registerEnterpriseJobs(jobRegistry: OverlayRegistry): void {
  for (const [name, handler] of Object.entries(enterpriseJobHandlers)) {
    jobRegistry.register(`enterprise:${name}`, handler);
  }
}
