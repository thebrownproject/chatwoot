import type {
  RoutableConversation,
  RoutingRule,
  RuleConditions,
  RuleMatch,
} from '../types.js';

const keywordRegexCache = new Map<string, RegExp>();

function getKeywordRegex(keyword: string): RegExp {
  const key = keyword.toLowerCase();
  let regex = keywordRegexCache.get(key);
  if (!regex) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`\\b${escaped}\\b`, 'i');
    keywordRegexCache.set(key, regex);
  }
  return regex;
}

/**
 * Evaluate all active routing rules against a conversation.
 * Rules are expected to be sorted by priority (lower number = higher priority).
 * Returns the first matching rule's action, or null if no rules match.
 */
export function evaluate(
  conversation: RoutableConversation,
  rules: RoutingRule[],
): RuleMatch | null {
  const activeRules = rules
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  for (const rule of activeRules) {
    if (matchConditions(conversation, rule.conditions)) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        targetType: rule.targetType,
        targetId: rule.targetId,
      };
    }
  }

  return null;
}

/**
 * Check if a conversation matches a set of rule conditions.
 * All specified conditions must match (AND logic).
 * Empty/missing conditions are treated as "match anything".
 */
export function matchConditions(
  conversation: RoutableConversation,
  conditions: RuleConditions,
): boolean {
  // If no conditions are specified, the rule matches everything
  const hasConditions =
    conditions.channel !== undefined ||
    (conditions.labels !== undefined && conditions.labels.length > 0) ||
    (conditions.keywords !== undefined && conditions.keywords.length > 0);

  if (!hasConditions) return true;

  // Channel match
  if (conditions.channel !== undefined) {
    if (conversation.channelOrigin !== conditions.channel) return false;
  }

  // Label match — conversation must have at least one of the rule's labels
  if (conditions.labels !== undefined && conditions.labels.length > 0) {
    const conversationLabels = conversation.labels ?? [];
    const hasMatchingLabel = conditions.labels.some((label) =>
      conversationLabels.includes(label),
    );
    if (!hasMatchingLabel) return false;
  }

  // Keyword match — at least one keyword must appear as a whole word in subject or body
  if (conditions.keywords !== undefined && conditions.keywords.length > 0) {
    const searchText = [conversation.subject ?? '', conversation.body ?? '']
      .join(' ')
      .toLowerCase();
    const hasMatchingKeyword = conditions.keywords.some((kw) =>
      getKeywordRegex(kw).test(searchText),
    );
    if (!hasMatchingKeyword) return false;
  }

  return true;
}
