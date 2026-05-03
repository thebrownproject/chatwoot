/**
 * Agent capacity management — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/policies/agent_capacity_policy.rb`
 *   `enterprise/app/models/inbox_capacity_limit.rb`
 *   `enterprise/app/models/agent_capacity_policy.rb`
 */

export interface CapacityAgent {
  id: number;
  accountId: number;
}

export interface CapacityInbox {
  id: number;
  accountId: number;
}

export interface CapacityAccount {
  id: number;
}

export function enforceCapacityLimit(_agent: CapacityAgent, _inbox: CapacityInbox): boolean {
  // TODO: check inbox_capacity_limit for inbox + agent; reject if exceeded.
  return true;
}

export function rebalanceCapacity(_account: CapacityAccount): void {
  // TODO: redistribute open conversations honoring agent_capacity_policy.
}
