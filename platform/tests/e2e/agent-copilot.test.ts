/**
 * E2E: Agent copilot flow
 *
 * Tests the copilot workflow: AI agent generates suggestions (internal),
 * human agent accepts/dismisses, and agent escalates with handoff.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlatform, type Platform } from './setup.js';

describe('Agent Copilot', () => {
  let p: Platform;
  let humanAgent: ReturnType<Platform['createUser']>;
  let ronAgent: ReturnType<Platform['createUser']>;
  let contact: ReturnType<Platform['createUser']>;
  let conv: ReturnType<Platform['createConversation']>;

  beforeEach(() => {
    p = createPlatform();

    humanAgent = p.createUser({
      type: 'human_agent',
      name: 'Joanna',
      email: 'joanna@buildpass.ai',
    });

    ronAgent = p.createUser({
      type: 'ai_agent',
      name: 'Ron Swanson',
      metadata: { model: 'claude-sonnet-4-20250514', capabilities: ['suggest', 'escalate'] },
    });

    contact = p.createUser({
      type: 'contact',
      name: 'Bob Builder',
      email: 'bob@builders.com',
    });

    conv = p.createConversation({
      channelOrigin: 'web_chat',
      subject: 'Building permit question',
    });
    p.assignConversation(conv.id, humanAgent.id, 'system');
    p.createMessage({
      conversationId: conv.id,
      senderId: contact.id,
      body: 'How do I submit my building permit application?',
    });
  });

  it('Ron added as copilot to conversation', () => {
    const participant = p.addParticipant(conv.id, ronAgent.id, 'copilot');

    expect(participant.role).toBe('copilot');
    expect(participant.userId).toBe(ronAgent.id);

    const participants = p.getParticipants(conv.id);
    expect(participants.find((p) => p.userId === ronAgent.id)).toBeDefined();
  });

  it('Ron generates suggestion (visibility: internal)', () => {
    p.addParticipant(conv.id, ronAgent.id, 'copilot');

    const suggestion = p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply:
        'You can submit your building permit through our online portal at buildpass.ai/permits. You\'ll need your plans and the site address.',
      confidence: 0.92,
      reasoning: 'Standard permit submission query — high confidence from KB articles',
    });

    expect(suggestion.status).toBe('pending');
    expect(suggestion.confidence).toBe(0.92);
    expect(suggestion.agentId).toBe(ronAgent.id);
    expect(suggestion.conversationId).toBe(conv.id);

    // The suggestion itself would be stored as an internal message
    const internalMsg = p.createMessage({
      conversationId: conv.id,
      senderId: ronAgent.id,
      visibility: 'internal',
      body: suggestion.suggestedReply,
      metadata: {
        type: 'copilot_suggestion',
        suggestionId: suggestion.id,
        confidence: suggestion.confidence,
      },
    });

    expect(internalMsg.visibility).toBe('internal');
  });

  it('human agent sees suggestion', () => {
    p.addParticipant(conv.id, ronAgent.id, 'copilot');

    p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply: 'Here is how to submit your permit...',
      confidence: 0.9,
      reasoning: 'KB match',
    });

    const pending = p.listPendingSuggestions(conv.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.status).toBe('pending');
    expect(pending[0]!.suggestedReply).toContain('submit your permit');
  });

  it('human accepts suggestion -> becomes public message', () => {
    p.addParticipant(conv.id, ronAgent.id, 'copilot');

    const suggestion = p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply: 'Here is how to submit your permit application...',
      confidence: 0.9,
      reasoning: 'KB match',
    });

    // Human accepts (possibly with edits)
    const accepted = p.acceptSuggestion(suggestion.id, 'Here is how to submit your permit — visit buildpass.ai/permits.');
    expect(accepted).toBeDefined();
    expect(accepted!.status).toBe('accepted');
    expect(accepted!.suggestedReply).toContain('buildpass.ai/permits');

    // Human sends the accepted suggestion as a public message
    const publicMsg = p.createMessage({
      conversationId: conv.id,
      senderId: humanAgent.id,
      visibility: 'public',
      body: accepted!.suggestedReply,
    });

    expect(publicMsg.visibility).toBe('public');
    expect(publicMsg.senderId).toBe(humanAgent.id);

    // No more pending suggestions
    const pending = p.listPendingSuggestions(conv.id);
    expect(pending).toHaveLength(0);
  });

  it('human dismisses next suggestion', () => {
    p.addParticipant(conv.id, ronAgent.id, 'copilot');

    const suggestion = p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply: 'This is not a great suggestion...',
      confidence: 0.3,
      reasoning: 'Low confidence — unclear query',
    });

    const dismissed = p.dismissSuggestion(suggestion.id);
    expect(dismissed).toBeDefined();
    expect(dismissed!.status).toBe('dismissed');

    // No pending suggestions
    const pending = p.listPendingSuggestions(conv.id);
    expect(pending).toHaveLength(0);
  });

  it('Ron escalates -> handoff to human, internal note with context', () => {
    p.addParticipant(conv.id, ronAgent.id, 'copilot');

    // Simulate Ron being assigned (e.g., Ron was handling as owner)
    p.assignConversation(conv.id, ronAgent.id, 'system');

    const handoff = p.requestHandoff(
      ronAgent.id,
      conv.id,
      'Customer is asking about a specific regulatory requirement I cannot verify',
      humanAgent.id,
    );

    expect(handoff.fromAgentId).toBe(ronAgent.id);
    expect(handoff.toUserId).toBe(humanAgent.id);
    expect(handoff.reason).toContain('regulatory requirement');
    expect(handoff.contextSummary).toContain('escalated');

    // Conversation reassigned to human
    const updated = p.getConversation(conv.id)!;
    expect(updated.assigneeId).toBe(humanAgent.id);

    // Escalation event created
    const events = p.getEvents(conv.id);
    const escalationEvent = events.find((e) => e.eventType === 'escalated');
    expect(escalationEvent).toBeDefined();
    expect(escalationEvent!.payload).toMatchObject({
      handoffId: handoff.id,
      reason: handoff.reason,
      toUserId: humanAgent.id,
    });

    // Internal note added
    const internalNote = p.createMessage({
      conversationId: conv.id,
      senderId: ronAgent.id,
      visibility: 'internal',
      body: `Escalation: ${handoff.contextSummary}`,
      metadata: { handoffId: handoff.id },
    });

    expect(internalNote.visibility).toBe('internal');

    // Internal notes not visible in public message list
    const publicMessages = p.listMessages(conv.id, 'public');
    expect(publicMessages.find((m) => m.id === internalNote.id)).toBeUndefined();
  });

  it('multiple suggestions — only pending ones returned', () => {
    p.addParticipant(conv.id, ronAgent.id, 'copilot');

    const s1 = p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply: 'First suggestion',
      confidence: 0.8,
      reasoning: 'r1',
    });

    const s2 = p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply: 'Second suggestion',
      confidence: 0.7,
      reasoning: 'r2',
    });

    const s3 = p.createSuggestion({
      conversationId: conv.id,
      agentId: ronAgent.id,
      suggestedReply: 'Third suggestion',
      confidence: 0.6,
      reasoning: 'r3',
    });

    p.acceptSuggestion(s1.id);
    p.dismissSuggestion(s2.id);

    const pending = p.listPendingSuggestions(conv.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe(s3.id);
  });
});
