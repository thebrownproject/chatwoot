/**
 * SLA management — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/services/enterprise/sla/`
 *   `enterprise/app/jobs/sla/`
 *   models: sla_policy, applied_sla, sla_event
 *
 * Pure addition, not an overlay — these feature exports live alongside OSS
 * code rather than overriding it.
 */

export interface SlaConversation {
  id: number;
  accountId: number;
  status: string;
}

export interface SlaPolicy {
  id: number;
  firstResponseTimeThreshold?: number;
  resolutionTimeThreshold?: number;
}

export function evaluateSla(_conversation: SlaConversation, _policy: SlaPolicy): void {
  // TODO: port from `enterprise/app/services/enterprise/sla/policy_service.rb`.
}

export function recordSlaBreach(_conversation: SlaConversation): void {
  // TODO: port from `enterprise/app/services/enterprise/sla/event_service.rb`.
}

export function cronProcessSla(): void {
  // TODO: BullMQ-backed equivalent of `enterprise/app/jobs/sla/process_job.rb`.
}
