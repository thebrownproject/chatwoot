/**
 * Audit logging — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/models/concerns/audit/`
 *   `audits` table (audited gem)
 */

export interface AuditActor {
  id: number;
  type: 'User' | 'System' | 'AgentBot';
}

export interface AuditTarget {
  type: string;
  id: number;
}

export function recordAuditEvent(
  _actor: AuditActor,
  _action: string,
  _target: AuditTarget,
): void {
  // TODO: insert into `audits` table; respect retention policy.
}
