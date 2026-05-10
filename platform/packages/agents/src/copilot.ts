import type { CopilotSuggestion, DbClient } from './types.js';

// ---------------------------------------------------------------------------
// In-memory store. Replace with Message table queries (Drizzle) in production.
// Not multi-process safe -- each process would have its own copy.
// ---------------------------------------------------------------------------

/** In-memory only. Replace with DB queries for multi-process deployment. */
const store = new Map<string, CopilotSuggestion>();

/** Reset internal state (for tests only). */
export function _resetCopilotStore(): void {
  store.clear();
}

// ---------------------------------------------------------------------------
// Suggestion lifecycle
// ---------------------------------------------------------------------------

/** Data for creating a new suggestion */
interface CreateSuggestionInput {
  conversationId: string;
  agentId: string;
  suggestedReply: string;
  confidence: number;
  reasoning: string;
}

/**
 * Create a copilot suggestion (internal message with confidence + reasoning).
 * In production this creates a Message with visibility=internal and typed metadata.
 */
export async function createSuggestion(
  _db: DbClient,
  data: CreateSuggestionInput,
): Promise<CopilotSuggestion> {
  if (data.confidence < 0 || data.confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  if (!data.suggestedReply || data.suggestedReply.trim().length === 0) {
    throw new Error('Suggested reply must not be empty');
  }

  const suggestion: CopilotSuggestion = {
    id: crypto.randomUUID(),
    conversationId: data.conversationId,
    agentId: data.agentId,
    suggestedReply: data.suggestedReply,
    confidence: data.confidence,
    reasoning: data.reasoning,
    status: 'pending',
    createdAt: new Date(),
  };

  store.set(suggestion.id, suggestion);
  return suggestion;
}

/**
 * Generate a draft reply suggestion for a conversation.
 * This is a higher-level function that would call the agent handler
 * to produce a suggestion. For now it delegates to createSuggestion.
 */
export async function generateSuggestion(
  _db: DbClient,
  _agentId: string,
  _conversationId: string,
): Promise<CopilotSuggestion> {
  throw new Error('generateSuggestion requires LLM integration — not yet implemented');
}

/**
 * Human accepts a copilot suggestion (with optional edits).
 * In production this converts the internal message to a public message.
 */
export async function acceptSuggestion(
  _db: DbClient,
  suggestionId: string,
  edits?: string,
): Promise<CopilotSuggestion | undefined> {
  const suggestion = store.get(suggestionId);
  if (!suggestion) return undefined;
  if (suggestion.status !== 'pending') return undefined;

  suggestion.status = 'accepted';
  if (edits !== undefined) {
    suggestion.suggestedReply = edits;
  }

  return suggestion;
}

/**
 * Human dismisses a copilot suggestion.
 */
export async function dismissSuggestion(
  _db: DbClient,
  suggestionId: string,
): Promise<CopilotSuggestion | undefined> {
  const suggestion = store.get(suggestionId);
  if (!suggestion) return undefined;
  if (suggestion.status !== 'pending') return undefined;

  suggestion.status = 'dismissed';
  return suggestion;
}

/**
 * Get all unactioned (pending) suggestions for a conversation.
 */
export async function listPendingSuggestions(
  _db: DbClient,
  conversationId: string,
): Promise<CopilotSuggestion[]> {
  return [...store.values()].filter(
    (s) => s.conversationId === conversationId && s.status === 'pending',
  );
}
