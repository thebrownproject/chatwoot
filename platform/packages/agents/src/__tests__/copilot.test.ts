import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSuggestion,
  generateSuggestion,
  acceptSuggestion,
  dismissSuggestion,
  listPendingSuggestions,
  _resetCopilotStore,
} from '../copilot.js';
import type { DbClient } from '../types.js';

const db = {} as DbClient;

beforeEach(() => {
  _resetCopilotStore();
});

describe('createSuggestion', () => {
  it('creates a pending suggestion', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Have you tried turning it off and on again?',
      confidence: 0.85,
      reasoning: 'Common troubleshooting step',
    });

    expect(suggestion.id).toBeDefined();
    expect(suggestion.conversationId).toBe('conv-1');
    expect(suggestion.agentId).toBe('agent-1');
    expect(suggestion.suggestedReply).toBe('Have you tried turning it off and on again?');
    expect(suggestion.confidence).toBe(0.85);
    expect(suggestion.reasoning).toBe('Common troubleshooting step');
    expect(suggestion.status).toBe('pending');
  });

  it('rejects confidence below 0', async () => {
    await expect(
      createSuggestion(db, {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        suggestedReply: 'Reply',
        confidence: -0.1,
        reasoning: 'test',
      }),
    ).rejects.toThrow('Confidence must be between 0 and 1');
  });

  it('rejects confidence above 1', async () => {
    await expect(
      createSuggestion(db, {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        suggestedReply: 'Reply',
        confidence: 1.5,
        reasoning: 'test',
      }),
    ).rejects.toThrow('Confidence must be between 0 and 1');
  });

  it('rejects empty suggested reply', async () => {
    await expect(
      createSuggestion(db, {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        suggestedReply: '',
        confidence: 0.5,
        reasoning: 'test',
      }),
    ).rejects.toThrow('Suggested reply must not be empty');
  });

  it('rejects whitespace-only suggested reply', async () => {
    await expect(
      createSuggestion(db, {
        conversationId: 'conv-1',
        agentId: 'agent-1',
        suggestedReply: '   ',
        confidence: 0.5,
        reasoning: 'test',
      }),
    ).rejects.toThrow('Suggested reply must not be empty');
  });
});

describe('generateSuggestion', () => {
  it('throws not-yet-implemented error', async () => {
    await expect(
      generateSuggestion(db, 'agent-1', 'conv-1'),
    ).rejects.toThrow('not yet implemented');
  });
});

describe('acceptSuggestion', () => {
  it('accepts a pending suggestion', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Draft reply',
      confidence: 0.9,
      reasoning: 'test',
    });

    const accepted = await acceptSuggestion(db, suggestion.id);
    expect(accepted).toBeDefined();
    expect(accepted!.status).toBe('accepted');
    expect(accepted!.suggestedReply).toBe('Draft reply');
  });

  it('accepts with edits', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Draft reply',
      confidence: 0.9,
      reasoning: 'test',
    });

    const accepted = await acceptSuggestion(db, suggestion.id, 'Edited reply');
    expect(accepted!.suggestedReply).toBe('Edited reply');
    expect(accepted!.status).toBe('accepted');
  });

  it('returns undefined for unknown suggestion', async () => {
    const result = await acceptSuggestion(db, 'nonexistent');
    expect(result).toBeUndefined();
  });

  it('returns undefined for already-accepted suggestion', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Draft',
      confidence: 0.8,
      reasoning: 'test',
    });

    await acceptSuggestion(db, suggestion.id);
    const result = await acceptSuggestion(db, suggestion.id);
    expect(result).toBeUndefined();
  });
});

describe('dismissSuggestion', () => {
  it('dismisses a pending suggestion', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Draft',
      confidence: 0.5,
      reasoning: 'test',
    });

    const dismissed = await dismissSuggestion(db, suggestion.id);
    expect(dismissed!.status).toBe('dismissed');
  });

  it('returns undefined when accepting a dismissed suggestion', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Draft',
      confidence: 0.5,
      reasoning: 'test',
    });

    await dismissSuggestion(db, suggestion.id);
    const result = await acceptSuggestion(db, suggestion.id);
    expect(result).toBeUndefined();
  });

  it('returns undefined for already-dismissed suggestion', async () => {
    const suggestion = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Draft',
      confidence: 0.5,
      reasoning: 'test',
    });

    await dismissSuggestion(db, suggestion.id);
    const result = await dismissSuggestion(db, suggestion.id);
    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown suggestion', async () => {
    const result = await dismissSuggestion(db, 'nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('listPendingSuggestions', () => {
  it('returns only pending suggestions for a conversation', async () => {
    const s1 = await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Reply 1',
      confidence: 0.8,
      reasoning: 'test',
    });

    await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'Reply 2',
      confidence: 0.7,
      reasoning: 'test',
    });

    // Accept one
    await acceptSuggestion(db, s1.id);

    const pending = await listPendingSuggestions(db, 'conv-1');
    expect(pending).toHaveLength(1);
    expect(pending[0]!.suggestedReply).toBe('Reply 2');
  });

  it('does not return suggestions from other conversations', async () => {
    await createSuggestion(db, {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      suggestedReply: 'For conv 1',
      confidence: 0.8,
      reasoning: 'test',
    });

    await createSuggestion(db, {
      conversationId: 'conv-2',
      agentId: 'agent-1',
      suggestedReply: 'For conv 2',
      confidence: 0.8,
      reasoning: 'test',
    });

    const pending = await listPendingSuggestions(db, 'conv-1');
    expect(pending).toHaveLength(1);
    expect(pending[0]!.conversationId).toBe('conv-1');
  });

  it('returns empty array when none pending', async () => {
    const pending = await listPendingSuggestions(db, 'conv-1');
    expect(pending).toEqual([]);
  });
});
