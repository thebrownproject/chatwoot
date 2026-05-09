import { describe, it, expect } from 'vitest';
import { evaluate, matchConditions } from '../engine/evaluator.js';
import type { RoutableConversation, RoutingRule } from '../types.js';

function makeRule(overrides: Partial<RoutingRule> = {}): RoutingRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    priority: 10,
    conditions: {},
    action: 'assign_agent',
    targetType: 'user',
    targetId: 'user-1',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeConversation(overrides: Partial<RoutableConversation> = {}): RoutableConversation {
  return {
    id: 'conv-1',
    channelOrigin: 'email',
    subject: null,
    labels: [],
    body: null,
    ...overrides,
  };
}

describe('matchConditions', () => {
  it('matches when no conditions are specified', () => {
    const result = matchConditions(makeConversation(), {});
    expect(result).toBe(true);
  });

  it('matches on channel', () => {
    const conv = makeConversation({ channelOrigin: 'email' });
    expect(matchConditions(conv, { channel: 'email' })).toBe(true);
    expect(matchConditions(conv, { channel: 'web_chat' })).toBe(false);
  });

  it('matches on labels (any-of)', () => {
    const conv = makeConversation({ labels: ['billing', 'urgent'] });
    expect(matchConditions(conv, { labels: ['billing'] })).toBe(true);
    expect(matchConditions(conv, { labels: ['support'] })).toBe(false);
    expect(matchConditions(conv, { labels: ['billing', 'onboarding'] })).toBe(true);
  });

  it('matches on keywords in subject', () => {
    const conv = makeConversation({ subject: 'Refund request for order #123' });
    expect(matchConditions(conv, { keywords: ['refund'] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['upgrade'] })).toBe(false);
  });

  it('matches on keywords in body', () => {
    const conv = makeConversation({ body: 'I need help with my invoice' });
    expect(matchConditions(conv, { keywords: ['invoice'] })).toBe(true);
  });

  it('keyword matching is case-insensitive', () => {
    const conv = makeConversation({ subject: 'URGENT REFUND' });
    expect(matchConditions(conv, { keywords: ['urgent'] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['Refund'] })).toBe(true);
  });

  it('keyword matching uses word boundaries (no false positives)', () => {
    const conv = makeConversation({ subject: 'Landing page demand analysis' });
    expect(matchConditions(conv, { keywords: ['and'] })).toBe(false);
    expect(matchConditions(conv, { keywords: ['land'] })).toBe(false);
    expect(matchConditions(conv, { keywords: ['demand'] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['landing'] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['analysis'] })).toBe(true);
  });

  it('requires ALL condition types to match (AND logic)', () => {
    const conv = makeConversation({
      channelOrigin: 'email',
      labels: ['billing'],
      subject: 'Refund needed',
    });

    // Both channel and labels match
    expect(matchConditions(conv, { channel: 'email', labels: ['billing'] })).toBe(true);

    // Channel matches but labels don't
    expect(matchConditions(conv, { channel: 'email', labels: ['support'] })).toBe(false);

    // Labels match but channel doesn't
    expect(matchConditions(conv, { channel: 'web_chat', labels: ['billing'] })).toBe(false);
  });
});

describe('evaluate', () => {
  it('returns null when no rules match', () => {
    const conv = makeConversation({ channelOrigin: 'sms' });
    const rules = [makeRule({ conditions: { channel: 'email' } })];
    expect(evaluate(conv, rules)).toBeNull();
  });

  it('returns the first matching rule by priority', () => {
    const conv = makeConversation({ channelOrigin: 'email' });
    const rules = [
      makeRule({ id: 'low', priority: 20, conditions: { channel: 'email' }, targetId: 'user-low' }),
      makeRule({ id: 'high', priority: 5, conditions: { channel: 'email' }, targetId: 'user-high' }),
      makeRule({ id: 'mid', priority: 10, conditions: { channel: 'email' }, targetId: 'user-mid' }),
    ];
    const match = evaluate(conv, rules);
    expect(match).not.toBeNull();
    expect(match!.ruleId).toBe('high');
    expect(match!.targetId).toBe('user-high');
  });

  it('skips inactive rules', () => {
    const conv = makeConversation({ channelOrigin: 'email' });
    const rules = [
      makeRule({ id: 'inactive', priority: 1, active: false, conditions: { channel: 'email' } }),
      makeRule({ id: 'active', priority: 10, active: true, conditions: { channel: 'email' } }),
    ];
    const match = evaluate(conv, rules);
    expect(match).not.toBeNull();
    expect(match!.ruleId).toBe('active');
  });

  it('returns the full action details on match', () => {
    const conv = makeConversation({ channelOrigin: 'email' });
    const rules = [
      makeRule({
        id: 'team-rule',
        conditions: { channel: 'email' },
        action: 'assign_team',
        targetType: 'team',
        targetId: 'team-1',
      }),
    ];
    const match = evaluate(conv, rules);
    expect(match).toEqual({
      ruleId: 'team-rule',
      ruleName: 'Test Rule',
      action: 'assign_team',
      targetType: 'team',
      targetId: 'team-1',
    });
  });

  it('matches a rule with empty conditions (catch-all)', () => {
    const conv = makeConversation();
    const rules = [makeRule({ conditions: {} })];
    expect(evaluate(conv, rules)).not.toBeNull();
  });

  it('returns null for empty rules array', () => {
    const conv = makeConversation();
    expect(evaluate(conv, [])).toBeNull();
  });

  it('uses stable tiebreak when priorities are equal', () => {
    const conv = makeConversation({ channelOrigin: 'email' });
    const rules = [
      makeRule({ id: 'bbb', priority: 10, conditions: { channel: 'email' }, targetId: 'user-b' }),
      makeRule({ id: 'aaa', priority: 10, conditions: { channel: 'email' }, targetId: 'user-a' }),
    ];
    const match = evaluate(conv, rules);
    expect(match!.ruleId).toBe('aaa');
  });
});

describe('edge cases', () => {
  it('ignores empty keyword strings in conditions', () => {
    const conv = makeConversation({ subject: 'Hello world' });
    expect(matchConditions(conv, { keywords: [''] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['', '  '] })).toBe(true);
  });

  it('ignores empty label strings in conditions', () => {
    const conv = makeConversation({ labels: [] });
    expect(matchConditions(conv, { labels: [''] })).toBe(true);
    expect(matchConditions(conv, { labels: ['', '  '] })).toBe(true);
  });

  it('treats conditions with only empty keywords as catch-all', () => {
    const conv = makeConversation({ subject: 'anything' });
    const rules = [makeRule({ conditions: { keywords: ['', '  '] } })];
    expect(evaluate(conv, rules)).not.toBeNull();
  });

  it('filters empty keywords but still matches valid ones', () => {
    const conv = makeConversation({ subject: 'I need a refund' });
    expect(matchConditions(conv, { keywords: ['', 'refund'] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['', 'upgrade'] })).toBe(false);
  });

  it('handles conversation with no subject and no body', () => {
    const conv = makeConversation({ subject: null, body: null });
    expect(matchConditions(conv, { keywords: ['anything'] })).toBe(false);
  });

  it('handles conversation with undefined labels', () => {
    const conv: RoutableConversation = {
      id: 'conv-1',
      channelOrigin: 'email',
    };
    expect(matchConditions(conv, { labels: ['billing'] })).toBe(false);
  });

  it('escapes regex special characters in keywords', () => {
    const conv = makeConversation({ subject: 'The price was 100.00 dollars' });
    expect(matchConditions(conv, { keywords: ['100.00'] })).toBe(true);
    expect(matchConditions(conv, { keywords: ['100.01'] })).toBe(false);
  });

  it('does not treat regex metacharacters as patterns', () => {
    const conv = makeConversation({ subject: 'Use .* for wildcards' });
    expect(matchConditions(conv, { keywords: ['.*'] })).toBe(false);
  });
});
