import type {
  RoutingDb,
  RoutingRule,
  RoutingRuleCreate,
  RoutingRuleUpdate,
} from '../types.js';

/** List all routing rules ordered by priority (lower number = higher priority). */
export function listRoutingRules(db: RoutingDb): Promise<RoutingRule[]> {
  return db.listRoutingRules();
}

/** Get a single routing rule by ID. */
export function getRoutingRule(
  db: RoutingDb,
  id: string,
): Promise<RoutingRule | null> {
  return db.getRoutingRule(id);
}

/** Create a new routing rule. */
export function createRoutingRule(
  db: RoutingDb,
  data: RoutingRuleCreate,
): Promise<RoutingRule> {
  return db.createRoutingRule(data);
}

/** Update an existing routing rule. Returns null if not found. */
export function updateRoutingRule(
  db: RoutingDb,
  id: string,
  data: RoutingRuleUpdate,
): Promise<RoutingRule | null> {
  return db.updateRoutingRule(id, data);
}

/** Delete a routing rule. Returns true if deleted, false if not found. */
export function deleteRoutingRule(
  db: RoutingDb,
  id: string,
): Promise<boolean> {
  return db.deleteRoutingRule(id);
}

/** Toggle a routing rule's active status. Returns the updated rule or null. */
export async function toggleRoutingRule(
  db: RoutingDb,
  id: string,
): Promise<RoutingRule | null> {
  const rule = await db.getRoutingRule(id);
  if (!rule) return null;
  return db.updateRoutingRule(id, { active: !rule.active });
}
