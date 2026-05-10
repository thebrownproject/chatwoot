import type {
  AssignmentAction,
  RoutingDb,
  TargetType,
} from '../types.js';

/**
 * In-memory round-robin index per team, capped at {@link MAX_ROUND_ROBIN_ENTRIES}
 * entries with FIFO eviction. Replace with Redis INCR for atomic cross-process
 * rotation in multi-process deployment.
 */
const roundRobinIndex = new Map<string, number>();
const MAX_ROUND_ROBIN_ENTRIES = 10_000;

/**
 * Execute a routing rule's action on a conversation.
 *
 * - assign_agent: directly assign the conversation to the target user
 * - assign_team: pick the next agent from the team via round-robin and assign
 * - assign_bot: directly assign the conversation to the target bot user
 */
export async function executeAction(
  db: RoutingDb,
  conversationId: string,
  action: AssignmentAction,
  _targetType: TargetType,
  targetId: string,
): Promise<{ assignedTo: string }> {
  switch (action) {
    case 'assign_agent':
    case 'assign_bot': {
      await db.assignConversation(conversationId, targetId);
      return { assignedTo: targetId };
    }
    case 'assign_team': {
      const agentId = await roundRobin(db, targetId);
      if (!agentId) {
        throw new Error(`No members in team ${targetId} for round-robin assignment`);
      }
      await db.assignConversation(conversationId, agentId);
      return { assignedTo: agentId };
    }
  }
}

/**
 * Get the next agent from a team using round-robin rotation.
 * Returns the user ID of the next agent, or null if the team has no members.
 *
 * Uses in-memory tracking of last assigned index per team.
 * Production should use Redis INCR for atomic cross-process rotation.
 */
export async function roundRobin(
  db: RoutingDb,
  teamId: string,
): Promise<string | null> {
  const members = await db.getTeamMembers(teamId);
  if (members.length === 0) return null;

  const lastIndex = roundRobinIndex.get(teamId) ?? -1;
  const nextIndex = (lastIndex + 1) % members.length;
  roundRobinIndex.set(teamId, nextIndex);

  if (roundRobinIndex.size > MAX_ROUND_ROBIN_ENTRIES) {
    const firstKey = roundRobinIndex.keys().next().value;
    if (firstKey !== undefined) roundRobinIndex.delete(firstKey);
  }

  return members[nextIndex]?.userId ?? null;
}

/** Remove round-robin state for a deleted team. */
export function clearRoundRobinForTeam(teamId: string): void {
  roundRobinIndex.delete(teamId);
}

/** Reset round-robin state (for testing). */
export function resetRoundRobin(): void {
  roundRobinIndex.clear();
}
