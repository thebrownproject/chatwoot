import type { AccountContext } from '../../lib/account-context.js';
import type { DomainEvent } from '../../events/publish.js';

/**
 * Automation rules. Conditions and actions live in JSONB columns on
 * `automation_rules` (see `app/models/automation_rule.rb` and
 * `app/services/automation_rules/*`). Evaluation — building a tiny
 * predicate/action interpreter over those JSON blobs — is a separate
 * Phase 3 deliverable; this stub fixes only the call-site signature so
 * service code can wire to it now.
 */
export async function evaluateAutomationRules(
  _event: DomainEvent,
  _context: AccountContext,
): Promise<void> {
  throw new Error('not implemented');
}
